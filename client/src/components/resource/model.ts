

export interface VersionLock {
    server: Version
}

export interface Version {
    version: string
    updateTime: number
}

export interface VersionStatusSet {
    server?: VersionStatus
}

export interface VersionStatus {
    currentVersion: string
    lastUpdateTime: Date
    latestVersion?: string
}
