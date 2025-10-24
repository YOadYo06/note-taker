import { Pinecone } from '@pinecone-database/pinecone';

export const getPineconeClient = async () => {
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  // if there’s an init or similar method, you may call it; but many examples show direct usage
  return client;
}
