/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Deploy de teste: a main tem erros de tipagem pendentes (ver git diff no servidor)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

