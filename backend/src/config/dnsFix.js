const dns = require('node:dns');

// Configure public DNS servers (Google and Cloudflare)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported
}

// Intercept dns.lookup to fallback to resolve4 when the OS getaddrinfo fails.
// This resolves issues where local router/hotspot DNS (e.g., 192.168.43.1)
// fails or refuses to resolve MongoDB Atlas cluster hostnames.
if (!dns.__atlasDnsPatched) {
  dns.__atlasDnsPatched = true;

  const origLookup = dns.lookup.bind(dns);

  dns.lookup = function(hostname, options, callback) {
    let cb = callback;
    let opts = options;

    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    } else if (typeof opts === 'number') {
      opts = { family: opts };
    } else if (!opts) {
      opts = {};
    }

    // Pass through local loopback and IP addresses directly to native lookup
    if (
      hostname === 'localhost' ||
      hostname === '::1' ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    ) {
      return origLookup(hostname, opts, cb);
    }

    origLookup(hostname, opts, (err, address, family) => {
      if (err) {
        dns.resolve4(hostname, (resErr, addresses) => {
          if (resErr || !addresses || addresses.length === 0) {
            return cb(err);
          }

          if (opts && opts.all) {
            const results = addresses.map((ip) => ({ address: ip, family: 4 }));
            return cb(null, results);
          }

          return cb(null, addresses[0], 4);
        });
      } else {
        cb(null, address, family);
      }
    });
  };
}

module.exports = dns;
