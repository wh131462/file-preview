import { execSync } from 'node:child_process'

const registry = 'https://registry.npmjs.com'

try {
  const who = execSync(`npm whoami --registry ${registry}`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
  if (!who) throw new Error('empty whoami')
  console.log(`✅ 已登录 npm: ${who}`)
} catch {
  console.error(`⚠️  未检测到 npm 登录状态，请先执行：\n    npm login --registry ${registry}`)
  process.exit(1)
}
