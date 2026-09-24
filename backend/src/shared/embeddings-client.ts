/**
 * Cliente mínimo para el endpoint de embeddings, compatible con OpenAI
 * (POST /embeddings con { model, input } -> { data: [{ embedding }] }).
 * EMBEDDINGS_* en .env (docs/04a-plantillas-repo.md).
 */
export interface EmbeddingsClientConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface EmbeddingsApiResponse {
  data: Array<{ embedding: number[] }>;
}

export async function createEmbedding(
  text: string,
  { baseUrl, apiKey, model }: EmbeddingsClientConfig,
): Promise<number[]> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!response.ok) {
    throw new Error(`Embeddings API respondió ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as EmbeddingsApiResponse;
  const embedding = body.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('Respuesta de embeddings sin data[0].embedding');
  }
  return embedding;
}
