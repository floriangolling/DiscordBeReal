import { ColorResolvable } from 'discord.js';
import AvailableChannelType from '@/types/availableChannelType';

export type BaseConfigChannel = {
  name: string;
  type: AvailableChannelType;
  description?: string;
  read: string[]
  write: string[]
  deny?: string[]
}

export type BaseConfigRole = {
  name: string;
  color: ColorResolvable;
  permissions: string[];
  displaySeparately?: boolean;
}

export type BasConfigCategory = {
  name: string;
  channels: BaseConfigChannel[];
}

export type ConfigBase = {
  roles: BaseConfigRole[];
  categories: BasConfigCategory[];
}
