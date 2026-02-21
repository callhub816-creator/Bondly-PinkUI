interface KeyState {
    value: string;
    index: number;
}

class KeyRotator {
    private keys: string[] = [];
    private currentKeyIndex: number = 0;

    constructor() {
        // @ts-ignore
        const rawKeys = import.meta.env.VITE_GEMINI_API_KEY || "";
        this.keys = rawKeys.split(",").map((k: string) => k.trim()).filter((k: string) => k);
    }

    public getKey(): KeyState | null {
        if (this.keys.length === 0) return null;
        return {
            value: this.keys[this.currentKeyIndex],
            index: this.currentKeyIndex
        };
    }

    public rotate(reason: string): void {
        if (this.keys.length <= 1) return;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    }

    public getAvailableKeysCount(): number {
        return this.keys.length;
    }
}

export const geminiRotator = new KeyRotator();
