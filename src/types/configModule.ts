export type ConfigFileChannel = {
  student_write?: boolean
  name: string
  type: 'GuildAnnouncement' | 'GuildText' | 'GuildForum'
}

export type ConfigFileModule = {
  name: string
  sub_modules: string[]
}

export type ConfigFilePromotion = {
  channels: ConfigFileChannel[]
}

export type ConfigFile = {
  [key: string]: ConfigFilePromotion | ConfigFileChannel[]
  '*': ConfigFileChannel[]
}
