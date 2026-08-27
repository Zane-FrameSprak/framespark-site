# FrameSpark HTTPS Certificate Automation

## Current arrangement

- Public names: `framespark.cn` and `www.framespark.cn`.
- Certificate issuer: TrustAsia LiteSSL through the BT Panel ACME client.
- Active certificate path:
  `/www/server/panel/vhost/cert/framespark.cn/fullchain.pem`.
- The active port 80 server serves `/.well-known/acme-challenge/` from
  `/www/wwwroot/framespark.cn` and redirects all other requests to HTTPS.
- `framespark-cert-renew.timer` runs a targeted renewal check every day.
- The duplicate BT Panel port 80 file was retained as
  `html_framespark.cn.conf.disabled-20260826T031003Z`, outside Nginx's
  `*.conf` include set.

The older BT Panel daily task was disabled because the HTML project config and
the active hand-maintained Nginx config use different filenames. BT Panel's
generic site scan therefore skipped the live certificate while its wrapper
still printed `Successful`.

Certbot was installed while testing an independent Let's Encrypt path, but
Let's Encrypt's secondary validation nodes repeatedly timed out against the
China-hosted DNS/HTTP endpoints. No Certbot certificate was deployed and
`certbot.timer` is disabled. TrustAsia remains the authoritative renewal path.

## Renewal behavior

`/usr/local/sbin/framespark-cert-renew`:

1. Resolves the hash of the certificate currently used by Nginx.
2. Calls the BT Panel ACME client for that exact certificate.
3. Renews only when expiry is within 30 days.
4. Validates Nginx and reloads it only when the certificate changed.
5. Requires both the certificate file and the live HTTPS endpoint to present
   the same certificate with more than 30 days remaining.
6. Writes success or failure to journald without logging private keys.

Inspect with:

```bash
systemctl status framespark-cert-renew.timer
systemctl status framespark-cert-renew.service
journalctl -u framespark-cert-renew.service --since '7 days ago'
```

## Recovery

The pre-change backup is stored under:

```text
/etc/framespark/backups/https-certbot/20260826T031003Z
```

Do not restore the expired certificate during an ordinary rollback. Restore
the Nginx files only if the ACME route itself is broken, then run `nginx -t`
before reloading Nginx.
