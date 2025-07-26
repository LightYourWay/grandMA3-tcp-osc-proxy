class Settings {
    verbose: boolean;
    
    constructor(properties: Partial<Settings> = {}) {
        this.verbose = properties.verbose ?? false;
    }
}

export const settings = new Settings();