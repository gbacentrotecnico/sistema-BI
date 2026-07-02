import { defineConfig } from '@prisma/config'

export default defineConfig({
  earlyAccess: true,
  studio: {
    port: 5555,
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:gbamecanica010203@localhost:5432/postgres?schema=public",
  }
})
