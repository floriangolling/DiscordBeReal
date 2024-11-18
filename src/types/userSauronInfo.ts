import { ApiData } from '@/types/apiData';

export interface UserSauronInfo extends ApiData {
  success: boolean
  student: {
    promotion: string;
    location: string;
  } | null;
  login: string;
}
