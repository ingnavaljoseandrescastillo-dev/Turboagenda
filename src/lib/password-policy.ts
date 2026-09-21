import { z } from 'zod'

export const AccountPasswordSchema = z
  .string()
  .min(10, 'Senha deve ter pelo menos 10 caracteres')
  .max(128, 'Senha demasiado longa')
