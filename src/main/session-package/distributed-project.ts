import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type {
  SessionPackageRequest,
  SessionPackageImportRequest
} from '../../shared/session-package'
import project from './pelican-project.json'

export { project as distributedProject }

async function sha256(file: string, signal?: AbortSignal): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file, { signal })) hash.update(chunk)
  return hash.digest('hex')
}

export async function isDistributedProject(file: string, signal?: AbortSignal): Promise<boolean> {
  const info = await stat(file)
  return (
    info.isFile() && info.size === project.bytes && (await sha256(file, signal)) === project.sha256
  )
}

// Only caller-verified catalog archives reach this path. Never extract paths supplied by a tar header.
export async function importDistributedProject(options: {
  source: string
  stage: string
  receipts: string
  signal: AbortSignal
  target: SessionPackageImportRequest
  exists: (identity: SessionPackageRequest) => Promise<boolean>
  forkMember: (id: SessionPackageRequest, model: string) => Promise<SessionPackageRequest>
  archiveSource: (id: SessionPackageRequest) => Promise<void>
  importMember: (
    path: string,
    target: SessionPackageImportRequest,
    index: number
  ) => Promise<SessionPackageRequest>
}): Promise<SessionPackageRequest> {
  const { receipts, target, signal } = options
  await mkdir(receipts, { recursive: true, mode: 0o700 })
  const key = createHash('sha256')
    .update(JSON.stringify([project.sha256, target.projectId ?? null, target.projectName ?? null]))
    .digest('hex')
  const receipt = join(receipts, key + '.json')
  let saved: Record<string, SessionPackageRequest> = {}
  try {
    saved = JSON.parse(await readFile(receipt, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  for (const [key, id] of Object.entries(saved)) if (!(await options.exists(id))) delete saved[key]
  async function remember(key: string, identity: SessionPackageRequest): Promise<void> {
    saved[key] = identity
    const temp = receipt + '.' + randomUUID()
    await writeFile(temp, JSON.stringify(saved), { mode: 0o600 })
    await rename(temp, receipt)
  }
  let projectId = target.projectId ?? Object.values(saved)[0]?.projectId
  for (const [i, member] of project.sessions.entries()) {
    signal.throwIfAborted()
    const sourceKey = 'source:' + member.file
    let native = saved[sourceKey]
    if (!saved[member.file]) {
      if (!native) {
        const part = join(options.stage, 'member.science')
        await pipeline(
          createReadStream(options.source, {
            start: member.offset,
            end: member.offset + member.bytes - 1
          }),
          createWriteStream(part, { flags: 'wx', mode: 0o600 }),
          { signal }
        )
        if ((await sha256(part, signal)) !== member.sha256)
          throw new Error('Project member failed verification.')
        native = await options.importMember(
          part,
          projectId ? { projectId } : { projectName: target.projectName ?? project.projectName },
          i
        )
        await remember(sourceKey, native)
        await rm(part)
      }
      projectId = native.projectId
      await remember(member.file, await options.forkMember(native, member.model))
    }
    if (native) await options.archiveSource(native)
  }
  return saved[project.sessions[0].file]
}
