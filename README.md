# Caching with Redis
## Cache your express responses with REDIS 
Dowload the script

## How to use
  - Install necessary packges:
      - Redis
      - Winston

  - Import in your project:
      - require or import the project

  - Setup packge: 
    - Example:
      ```
      const RedisCacheAdapter = require('./src/RedisCache')
      var Cache = new RedisCacheAdapter({/* Your redis configuration, like auth */})
      Cache.connect()
      ```

  - Use as middleware:
    - Use case: 
    
        -Old way: 
          ```
              app.get("/", async (req, res) => { /* your code */
          ```
          
        -With Caching: 
          ```
              app.get("/",(req, res, next) => {return Cache.route(req, res, next, 60/* time in seconds to expire the cache */)} , async (req, res) => {
          ```

## Logging: 
    - In your .env file difine NODE_ENV=production: log only in terminal
        - NODE_ENV != production: log into 2(two) files in root
