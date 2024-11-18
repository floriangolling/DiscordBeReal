import Logger from '@/lib/logger';
import { UserSauronInfo } from '@/types/userSauronInfo';

async function fetchUserData(
  login: string,
): Promise<UserSauronInfo | null> {
  try {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SAURON_TOKEN}`,
      },
    };
    const response = await fetch(
      `https://nsa.epitest.eu/api/promo/${login}`,
      config,
    );

    const data = await response.json();
    if (!response.ok) {
      Logger.error(
        'error',
        `Fetch failed for user ${login}. Error: ${response.status} ${data.error}`,
      );
      return null;
    }
    return data;
  } catch (error) {
    Logger.error('error', `Error fetching student data: ${error}`);
    return null;
  }
}

export default fetchUserData;
