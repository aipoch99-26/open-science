import { expect } from '@playwright/test'
import { test } from './fixtures/electron-app'
import { createProject, openProjectSession } from './certification/helpers'

test('opens the lab loader in a single reusable workbench tab', async ({ app }) => {
  await app.completeOnboarding()
  const project = '3D lab preview'
  const title = 'Completed notebook analysis'
  const projectId = await createProject(await app.configureFakeAgent(), project)
  const page = await app.restartWithSessionFixture(
    {
      id: 'lab-preview',
      projectId,
      title,
      cwd: '',
      status: 'idle',
      messages: [],
      activities: [],
      createdAt: 1,
      updatedAt: 2
    },
    [
      {
        runId: 'lab-run',
        cellId: 'sample',
        source: 'user',
        kernelKind: 'python',
        script: '1 + 1',
        status: 'completed',
        startedAt: 1,
        endedAt: 2,
        outputs: [],
        artifacts: [],
        workingFiles: [],
        text: { stdout: '', stderr: '', traceback: '', plain: ['2'] }
      }
    ]
  )
  await openProjectSession(page, project, title)
  await page.getByRole('button', { name: 'Open notebook' }).click()
  const notebook = page.getByRole('tab', { name: 'Notebook', exact: true })
  await expect(notebook).toHaveAttribute('aria-selected', 'true')
  const create = page.getByRole('button', { name: 'Create 3D Lab', exact: true })
  await create.click()
  const tab = page.getByRole('tab', { name: '3D Lab', exact: true })
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  const pane = page.getByRole('tabpanel', { name: '3D Lab', exact: true })
  await expect(pane.locator('svg')).toBeVisible()
  await expect(pane.getByRole('status')).toHaveText('Loading…')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(pane.locator('.lab-bench')).toHaveCSS('animation-iteration-count', 'infinite')
  await expect(notebook).toHaveAttribute('aria-selected', 'false')
  await notebook.click()
  await expect(notebook).toHaveAttribute('aria-selected', 'true')
  await create.click()
  await expect(tab).toHaveCount(1)
  await page.getByRole('button', { name: 'Close preview of 3D Lab' }).click()
  await expect(tab).toHaveCount(0)
  await create.click()
  await expect(pane.locator('svg')).toBeVisible()
})
