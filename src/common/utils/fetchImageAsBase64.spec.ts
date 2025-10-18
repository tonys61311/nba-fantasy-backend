import axios from 'axios';
import { fetchImageAsBase64 } from './fetchImageAsBase64';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchImageAsBase64', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ESPN_S2 = 's2';
    process.env.SWID = '{swid}';
  });

  it('returns data URL with base64 when axios succeeds', async () => {
    const buffer = Buffer.from([1, 2, 3, 4]);
    mockedAxios.get.mockResolvedValue({ data: buffer, headers: { 'content-type': 'image/png' } } as any);
    const url = 'https://example.com/logo.png';
    const result = await fetchImageAsBase64(url);
    expect(mockedAxios.get).toHaveBeenCalledWith(url, expect.objectContaining({
      responseType: 'arraybuffer',
      headers: expect.objectContaining({
        'User-Agent': expect.any(String),
        'Referer': 'https://fantasy.espn.com/',
        'Cookie': expect.stringContaining('espn_s2=s2; SWID={swid};'),
      }),
    }));
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('returns null and logs warning on failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network'));
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await fetchImageAsBase64('https://example.com/bad.png');
    expect(result).toBeNull();
    expect(spyWarn).toHaveBeenCalled();
    spyWarn.mockRestore();
  });
});


