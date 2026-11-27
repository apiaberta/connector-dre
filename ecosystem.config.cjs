module.exports = {
  apps: [
    {
      name: 'apiaberta-dre',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3015,
        MONGO_URI: 'mongodb://localhost:27017/apiaberta-dre',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    }
  ]
}
