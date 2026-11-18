import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  distributedProject,
  importDistributedProject,
  isDistributedProject
} from './distributed-project'
import { parseBrowserImportUrl } from './browser-import-protocol'
vi.mock('./pelican-project.json', () => ({
  default: { filename: 'Ride.science', projectName: 'Ride', bytes: 3, sha256: '', sessions: [] }
}))
const sum = (s: string): string => createHash('sha256').update(s).digest('hex')
let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'distributed-project-test-'))
  distributedProject.sha256 = sum('abc')
  distributedProject.sessions = [...'abc'].map((v, i) => ({
    file: v,
    model: v,
    offset: i,
    bytes: 1,
    sha256: sum(v)
  }))
  await writeFile(join(root, 'input'), 'abc')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})
it('requires the reviewed size and digest, and restricts file-origin links to that project', async () => {
  const url =
    'open-science-project://import?' +
    new URLSearchParams({
      version: '2',
      origin: 'null',
      secret: 'a'.repeat(64),
      port: '59000',
      name: 'Ride.science',
      size: '3'
    })
  expect(parseBrowserImportUrl(url)).not.toBeNull()
  expect(parseBrowserImportUrl(url.replace('version=2', 'version=1'))).toBeNull()
  expect(parseBrowserImportUrl(url.replace('size=3', 'size=4'))).toBeNull()
  expect(await isDistributedProject(join(root, 'input'))).toBe(true)
  await writeFile(join(root, 'input'), 'abd')
  expect(await isDistributedProject(join(root, 'input'))).toBe(false)
})
it('resumes a failed fork and reopens the same three editable conversations', async () => {
  const stage = join(root, 'stage')
  await mkdir(stage)
  const opened: string[] = [],
    archived = new Set<string>()
  let interrupt = true
  const run = () =>
    importDistributedProject({
      source: join(root, 'input'),
      stage,
      receipts: join(root, 'receipts'),
      target: {},
      signal: new AbortController().signal,
      exists: async () => true,
      importMember: async (path, dest, i) => {
        expect(i ? dest.projectId : dest.projectName).toBe(i ? 'project' : 'Ride')
        const value = await readFile(path, 'utf8')
        opened.push(value)
        return { projectId: 'project', sessionId: value }
      },
      forkMember: async (id) => {
        if (id.sessionId === 'b' && interrupt) {
          interrupt = false
          throw Error('interrupted')
        }
        return { ...id, sessionId: 'editable-' + id.sessionId }
      },
      archiveSource: async (id) => {
        archived.add(id.sessionId)
      }
    })
  await expect(run()).rejects.toThrow('interrupted')
  expect((await run()).sessionId).toBe('editable-a')
  expect((await run()).sessionId).toBe('editable-a')
  expect(opened).toEqual(['a', 'b', 'c'])
  expect([...archived]).toEqual(opened)
})
