import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const registry = 'https://registry.npmjs.com'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, version] of Object.entries(pkg[field] ?? {})) {
    if (String(version).startsWith('workspace:')) {
      console.error(
        `发布包不得在 ${field} 中使用 workspace 协议（npm 消费者无法解析）: ${name}=${version}`,
      )
      process.exit(1)
    }
  }
}

try {
  const who = execSync(`npm whoami --registry ${registry}`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
  if (!who) throw new Error('empty whoami')
  console.log(`✅ 已登录 npm: ${who}`)
} catch {
  console.error(`⚠️  未检测到 npm 登录状态，请先执行：\n    npm login --registry ${registry}`)
  process.exit(1)
}
