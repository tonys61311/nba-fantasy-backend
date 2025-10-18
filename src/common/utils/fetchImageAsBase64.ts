import axios from 'axios';
import sharp from 'sharp';
import { env } from '../../config/env';

export async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // header 要幫我帶上 { Cookie: `espn_s2=${this.cookies.espnS2}; SWID=${this.cookies.swid};` };
    const cookies = {
      espnS2: env.getEspnS2(),
      swid: env.getSwid(),
    };
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://fantasy.espn.com/',
      'Cookie': `espn_s2=${cookies.espnS2}; SWID=${cookies.swid};`,
    };
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: headers,
    });
    const mime = res.headers['content-type'] || 'image/png';
    let buffer = Buffer.from(res.data);

    // 🧠 若為 SVG，轉成 PNG 再 Base64
    if (mime.includes('svg')) {
      buffer = await sharp(buffer).png().toBuffer();
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }

    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    // Non-fatal: return null for logoBase64
    console.warn(`[fetchImageAsBase64] Failed to fetch image: ${url}, ${err.message}`);
    return null;
  }
}


