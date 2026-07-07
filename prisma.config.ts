import { defineConfig } from '@prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:gbamecanica010203@localhost:5432/sistema_bi?schema=public",
  }
})
