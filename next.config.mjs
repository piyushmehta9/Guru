/** @type {import('next').NextConfig} */
module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};
const nextConfig = {
    images: {
      remotePatterns: [
        {
            protocol:"https",
        hostname:"randomuser.me",
        },
      ],
    },
  };

export default nextConfig;
