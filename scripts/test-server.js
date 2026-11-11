import { mkdtemp, copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

// Browser tests write only to a temporary copy, never to the user's accounts.
const directory = await mkdtemp(join(tmpdir(), 'findmyroom-test-'))
process.env.AUTH_ACCOUNTS_FILE = join(directory, 'account.json')
process.env.HOUSE_REVIEWS_FILE = join(directory, 'review.json')
process.env.REVIEW_IMAGES_FILE = join(directory, 'review_image.json')
process.env.MANAGED_HOUSES_FILE = join(directory, 'managed-houses.json')
process.env.HOUSE_IMAGES_FILE = join(directory, 'boarding_house_image.json')
process.env.RENTALS_FILE = join(directory, 'room_post.json')
process.env.RENTAL_IMAGES_FILE = join(directory, 'room_post_image.json')
process.env.RENTAL_AMENITIES_FILE = join(directory, 'room_post_amenity.json')
process.env.AMENITY_FILE = join(directory, 'amenity.json')
await copyFile(new URL('../data/account.json', import.meta.url), process.env.AUTH_ACCOUNTS_FILE)
const server = await createServer({ server: { host: '127.0.0.1', port: 5174, strictPort: true } })
async function stop() {
  await server.close()
  await rm(directory, { recursive: true, force: true })
  process.exit(0)
}
process.once('SIGTERM', stop)
process.once('SIGINT', stop)
await server.listen()
server.printUrls()
