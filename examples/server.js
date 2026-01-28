/**
 * 简单的 HTTP 服务器用于提供示例页面
 * 访问: http://localhost:3001
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 3001

const server = createServer(async (req, res) => {
  try {
    let filePath = join(__dirname, 'test-page.html')
    
    // 处理不同的路径
    if (req.url === '/' || req.url === '/test-page.html') {
      filePath = join(__dirname, 'test-page.html')
    } else if (req.url.startsWith('/packages/sdk/dist/')) {
      // 处理 SDK 文件请求
      filePath = join(__dirname, '..', req.url)
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('404 Not Found')
      return
    }

    const content = await readFile(filePath)
    
    // 设置正确的 Content-Type
    let contentType = 'text/html'
    if (filePath.endsWith('.js')) {
      contentType = 'application/javascript'
    } else if (filePath.endsWith('.css')) {
      contentType = 'text/css'
    }

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    })
    res.end(content)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end(`Server Error: ${error.message}`)
  }
})

server.listen(PORT, () => {
  console.log(`\n✨ 示例页面服务器已启动！`)
  console.log(`\n📍 访问地址: http://localhost:${PORT}`)
  console.log(`\n💡 提示: 确保已运行 'pnpm dev:server' 启动 API 服务器 (端口 4100)\n`)
})
