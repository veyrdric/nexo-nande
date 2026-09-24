import { z } from 'zod';

/**
 * Formato de scraper/data/curado/*.json (docs/02-modelo-de-datos.md §5).
 * snake_case porque coincide 1:1 con las columnas de knowledge_documents;
 * distinto del contrato de ingesta de docs/02-contratos.md §5 (camelCase, API de n8n/panel).
 */
export const officeSchema = z
  .object({
    name: z.string().min(1),
    address: z.string().min(1),
    hours: z.string().min(1),
    locality: z.string().min(1),
  })
  .nullable();

export const curatedDocumentSchema = z.object({
  code: z.string().regex(/^[A-Z0-9-]+$/, 'code debe ser MAYÚSCULAS-CON-GUIONES'),
  title: z.string().min(1),
  summary: z.string().min(1),
  requirements: z.array(z.string()),
  office: officeSchema,
  source_url: z.string().min(1),
  captured_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'captured_at debe ser YYYY-MM-DD'),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'valid_until debe ser YYYY-MM-DD')
    .nullable(),
  status: z.enum(['pending_review', 'approved', 'rejected']),
  is_fictional: z.boolean(),
});

export type CuratedDocument = z.infer<typeof curatedDocumentSchema>;
