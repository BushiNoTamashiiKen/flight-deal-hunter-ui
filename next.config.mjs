/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@cursor/sdk");
    }
    return config;
  },
};

export default nextConfig;
