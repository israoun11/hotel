import manifest from "./photo-manifest.json";

/**
 * Photographs published by the hotel on its official website (menarahammamet.com).
 *
 * By default they are loaded from the hotel's own website. Run `npm run photos:download` once
 * (on a machine with internet access) to copy them into public/photos/: the site then serves the local copies.
 * Photos added in the backend gallery (admin → Gallery) are shown in addition to these.
 */
export type PhotoGroup = "hotel" | "rooms" | "spa";

export interface Photo {
  id: string;
  group: PhotoGroup;
  /** Image candidates, best first. The <Photo> component tries the next one if one fails. */
  sources: string[];
}

const REMOTE = "https://www.menarahammamet.com/images";
const local = new Set<string>(manifest.local);

function photo(id: string, remotePath: string, group: PhotoGroup): Photo {
  const remote = `${REMOTE}/${remotePath}`;
  return { id, group, sources: local.has(id) ? [`/photos/${id}.jpg`, remote] : [remote] };
}

/** id = the photographer's file number used on the official website. */
export const PHOTOS = {
  hotel: [
    photo("moz-7375", "1200/17391398/MOZ_7375-jZgJf0g4QFLXGAqv-V-jvQ.JPG", "hotel"),
    photo("moz-7429", "1200/17391405/MOZ_7429-Zj_TfTqP42phYRIUwV3ZOw.JPG", "hotel"),
    photo("moz-7432", "1200/17391408/MOZ_7432-gFJ1ZmbkxtNwf1RPhTfRdw.JPG", "hotel"),
    photo("moz-7413", "1200/17393419/MOZ_7413-u0rZRrTQXxcHDc5DUY9KkA.JPG", "hotel"),
  ],
  rooms: [
    photo("moz-7366", "1200/17391396/MOZ_7366-WWZ1_Z-y6JLbHI0U52SM_w.JPG", "rooms"),
    photo("moz-7356", "1200/17391392/MOZ_7356-qzq9mj1B02Zkx2-c-wW1ow.JPG", "rooms"),
    photo("moz-7351", "1200%2C90/17391390/MOZ_7351-nrdNTxOduv7ajkDwVxS-2g.JPG", "rooms"),
    photo("moz-7345", "1200/17391388/MOZ_7345-u69nQY0CDJrbRq_xSTt3Mg.JPG", "rooms"),
    photo("moz-7338", "1200/17391385/MOZ_7338-Z-hxDfJtbGSZS6znMpucWQ.JPG", "rooms"),
  ],
  spa: [
    photo("moz-7264", "1200/17393730/MOZ_7264-nI3yxroDZ7zdHkkP-_JQ-w.JPG", "spa"),
    photo("moz-7284", "1200/17393743/MOZ_7284-O6gqyi_5_z0cBENMtTAnmw.JPG", "spa"),
    photo("moz-7289", "1200/17393745/MOZ_7289-92rYdB3U3L0_GA4YDMcI1Q.JPG", "spa"),
    photo("moz-7273", "1200/17393738/MOZ_7273-nlgx35nNabjXzPRa_6_fMA.JPG", "spa"),
    photo("moz-7292", "1200/17393752/MOZ_7292-5H3VHa1MrRg3V76PQj1bqg.JPG", "spa"),
  ],
} satisfies Record<PhotoGroup, Photo[]>;

export const ALL_PHOTOS: Photo[] = [...PHOTOS.hotel, ...PHOTOS.rooms, ...PHOTOS.spa];
