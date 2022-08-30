const redis = require("redis");
const winston = require('winston');
const { combine, timestamp, label, printf } = winston.format;
const myFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
  });
  
const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    myFormat
  ),
  defaultMeta: { service: 'RedisCacheAdapter' },
  transports: [
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}else{
  logger.add(new winston.transports.File({ filename: 'error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'combined.log' }));
}

class RedisCacheAdapter {
  constructor(RedisOptions) {
    this.client = redis.createClient(RedisOptions);
    this.connected = false;
    this.route = this.route.bind(this);

    if (this.client.on) {
      this.client.on(
        "connect",
        function () {
          this.connected = true;
          logger.info("Connected to Redis.");
        }.bind(this)
      );

      this.client.on(
        "error",
        function (err) {
          logger.warn(`Error on Redis: ${err}`);
        }.bind(this)
      );
    }
  }

  async connect() {
    await this.client.connect();
  }
  async AddRCache(key, value, exp) {
    await this.client.set(key, value)
    await this.client.expireAt(key, parseInt((+new Date)/1000) + exp)
  }

  async route(req, res, next, exp = 60) {
    //if redis disconnected, call next()
    if (this.connected === false) {
      return next();
    }

    var name = req.originalUrl;

    //tryng to get cache
    let result = await this.client.get(name);
    result = JSON.parse(result)
    if (result) {
      logger.info(`Already Cached Route: ${name}`);
      let buff = new Buffer.from(result.body, 'base64');
      let text = buff.toString('UTF-8');
      res.contentType(result.type || "text/html");
      res.send(text);
      return;
    }

    //cache dont exist
    logger.info(`Caching the new Response: ${name}`);

    /** wrap res.send **/
    var send = res.send.bind(res);

    res.send = async function (body) {
      /** send output to HTTP client **/
      var ret = send(body);

      body = new Buffer.from(body).toString("base64");

      /** save only strings to cache **/
      if (typeof body !== "string") {
        return ret;
      }

      /** Create the new cache **/
      let headers = []
      headers = res._header.toString().split('\r\n')
      headers = headers.map((header) => {
        return header.toString().split(': ')
      })
      let contentHeader = null
      headers.forEach((header) => {
        if(header[0] == 'Content-Type') {
            contentHeader = header[1]
            return
        }
      })

      await this.AddRCache(name,
        JSON.stringify({
            body, 
            type: contentHeader
        }),
        exp);

      return ret;
    }.bind(this);
    logger.info(`'Cached: ${name} to ${exp} seconds.`)
    next();
  }
}

module.exports = RedisCacheAdapter;
