import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MediaService {
  private readonly accessToken: string = process.env.WHATSAPP_WEBHOOK_ACCESS_TOKEN!

  constructor() {}

  async getMediaUrl(mediaId: string): Promise<string> {
    const url = `https://graph.facebook.com/v22.0/${mediaId}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return response.data.url;
  }

  async downloadMediaBuffer(fileUrl: string): Promise<{ buffer: Buffer; size: number; mimeType: string }> {
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const size = Number(response.headers['content-length']) || response.data.length;
    const mimeType = response.headers['content-type'] || 'audio/ogg';
    const buffer = Buffer.from(response.data);

    return { buffer, size, mimeType };
  }
}
