// app.ts
// This TypeScript code loads multiple keyboard layouts from hardcoded JSON files using fetch,
// performs frequency analysis on a key log, generates heatmaps on an HTML canvas, and analyzes
// consecutive key sequences (bigrams). It includes a mapping to handle special keys whose logged
// tokens differ from their printed representation, and displays multiple layouts side by side.

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const analyzeButton = document.getElementById('analyzeButton') as HTMLButtonElement;
    const heatmapButton = document.getElementById('heatmapButton') as HTMLButtonElement;
    const bigramButton = document.getElementById('bigramButton') as HTMLButtonElement; // New button for bigram analysis
    const outputDiv = document.getElementById('output') as HTMLDivElement;
    const canvas = document.getElementById('heatmapCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    // Array to store multiple layouts along with their name.
    let layouts: Array<{ name: string, keys: { key: string, x: number, y: number }[] }> = [];
    // Frequency map for key events from log analysis.
    let frequencyMap: Map<string, number> = new Map();
    // Store tokens from the log file for further analysis.
    let tokenList: string[] = [];

    // Mapping for special keys: layout printed key -> possible tokens in the log.
    const keyMapping: { [key: string]: string[] } = {
        "tab": ["<Tab>", "tab"],
        "capslock": ["<CapsLock>", "capslock"],
        "全角/半角": ["<F>", "<H>"],
        "半角/全角": ["<F>", "<H>"],
        "shift": ["<ShiftLeft>", "<ShiftRight>", "shift"],
        "ctrl": ["<ControlLeft>", "<ControlRight>", "ctrl"],
        "win": ["<MetaLeft>", "<MetaRight>", "win"],
        "alt": ["<AltLeft>", "<AltRight>", "alt"],
        "esc": ["<Escape>", "esc"],
        "space": ["<Space>", "space", " "],
        "backspace": ["<Backspace>", "backspace"],
        "delete": ["<Delete>", "delete"],
        "enter": ["<Enter>", "<Return>", "enter"],
        "app": ["<App>", "app"],
        // Add more mappings if needed.
    };

    /**
     * Fetches a keyboard layout JSON file and adds it to the layouts array.
     * @param name - The name identifier of the layout (used in the file path and for display).
     */
    function loadLayout(name: string) {
        // Hardcoded JSON file path. For example, "layouts/bem.json" or "layouts/qwerty.json".
        fetch(`layouts/${name}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data: { key: string, x: number, y: number }[]) => {
                layouts.push({ name, keys: data });
                console.log(`Layout ${name} loaded:`, data);
            })
            .catch(error => console.error(`Error loading layout JSON for ${name}:`, error));
    }

    /**
     * Parses the key log text into individual tokens.
     * キーログのテキストを個々のトークンに分割します。
     * @param logText - The full text content from the key log file.
     * @returns An array of key event tokens.
     */
    function parseLog(logText: string): string[] {
        return logText.split(/\s+/).filter(token => token.length > 0);
    }

    /**
     * Analyzes the frequency of each key event in the log.
     * ログ内の各キーイベントの出現頻度を解析します。
     * @param tokens - Array of tokens representing key events.
     * @returns A Map where each key is a token and its value is the frequency count.
     */
    function analyzeLog(tokens: string[]): Map<string, number> {
        const freqMap = new Map<string, number>();
        tokens.forEach(token => {
            freqMap.set(token, (freqMap.get(token) || 0) + 1);
        });
        return freqMap;
    }

    /**
     * Retrieves the frequency count for a given printed key by checking its mapped tokens.
     * 指定された印字キーに対して、マッピングされたトークンをチェックして出現頻度を取得します。
     * @param printedKey - The key as printed in the layout.
     * @param freqMap - The frequency map from the log analysis.
     * @returns Frequency count for the key.
     */
    function getKeyFrequency(printedKey: string, freqMap: Map<string, number>): number {
        const lowerKey = printedKey.toLowerCase();
        // Check if a mapping exists for special keys.
        if (keyMapping[lowerKey]) {
            for (const token of keyMapping[lowerKey]) {
                if (freqMap.has(token)) {
                    return freqMap.get(token)!;
                }
            }
        }
        // Fallback to directly checking the printed key.
        return freqMap.get(printedKey) || 0;
    }

    /**
     * Displays the frequency analysis results.
     * 出現頻度解析の結果を表示します。
     */
    function displayAnalysis(map: Map<string, number>) {
        const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
        let text = 'Key Event Frequency Analysis:\n-------------------------------\n';
        entries.forEach(([key, count]) => {
            text += `${key}: ${count}\n`;
        });
        outputDiv.textContent = text;
    }

    /**
     * Generates heatmaps on the canvas based on the loaded layouts and frequency map.
     * 各レイアウトと出現頻度マップに基づいて、HTML Canvas 上にヒートマップを生成します。
     * Each layout is rendered with a vertical offset to display them side by side.
     * @param layouts - Array of keyboard layouts.
     * @param freqMap - Frequency map of key events.
     */
    function generateHeatmap(layouts: Array<{ name: string, keys: { key: string, x: number, y: number }[] }>, freqMap: Map<string, number>) {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Determine the maximum frequency for color scaling across all keys.
        let maxFreq = 0;
        freqMap.forEach(count => {
            if (count > maxFreq) maxFreq = count;
        });

        const fixedHue = 0; // Red
        const saturation = 100;
        const radius = 20;
        const layoutSpacing = 300; // Vertical space between layouts

        layouts.forEach((layoutObj, index) => {
            const offsetY = index * layoutSpacing;
            // Optionally, draw layout name above its keys.
            if (ctx) {
                ctx.fillStyle = '#000000';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(layoutObj.name.toUpperCase(), 150, 30 + offsetY);
            }
            layoutObj.keys.forEach(item => {
                const freq = getKeyFrequency(item.key, freqMap);
                const ratio = maxFreq === 0 ? 0 : freq / maxFreq;
                // Lightness scales from 90% (low frequency) to 30% (high frequency)
                const lightness = 90 - Math.floor(60 * ratio);
                const color = `hsl(${fixedHue}, ${saturation}%, ${lightness}%)`;

                // Draw the key as a circle with vertical offset
                ctx.beginPath();
                ctx.arc(item.x, item.y + offsetY, radius, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();

                // Draw the key label
                ctx.fillStyle = '#777777';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.key, item.x, item.y + offsetY);
            });
        });
    }

    /**
     * Analyzes consecutive two-key sequences (bigrams) from the token list.
     * トークンリストから連続する2つのキー（バイグラム）を解析します。
     * @param tokens - Array of key event tokens.
     * @returns A Map where each key is a bigram and its value is the frequency count.
     */
    function analyzeBigrams(tokens: string[]): Map<string, number> {
        const bigramMap = new Map<string, number>();
        // Iterate through the token array (except the last token)
        for (let i = 0; i < tokens.length - 1; i++) {
            // Create a bigram from the current token and the next token
            const bigram = `${tokens[i]} ${tokens[i + 1]}`;
            // Increase the frequency count for this bigram
            bigramMap.set(bigram, (bigramMap.get(bigram) || 0) + 1);
        }
        return bigramMap;
    }

    /**
     * Displays the most frequent bigrams in the output area.
     * 最も頻出するバイグラムを出力領域に表示します。
     * @param bigramMap - Map of bigrams with their frequency counts.
     * @param topN - Number of top bigrams to display.
     * @returns A string representing the formatted bigram analysis.
     */
    function displayBigrams(bigramMap: Map<string, number>, topN: number = 10): string {
        const sortedBigrams = Array.from(bigramMap.entries()).sort((a, b) => b[1] - a[1]);
        let output = 'Frequent Two-Key Sequences:\n-----------------------------\n';
        for (let i = 0; i < Math.min(topN, sortedBigrams.length); i++) {
            const [bigram, count] = sortedBigrams[i];
            output += `${bigram}: ${count}\n`;
        }
        return output;
    }

    // Load multiple layouts when the page loads.
    loadLayout("bem");
    loadLayout("qwerty");
    loadLayout("onishi");

    // Event listener for log analysis button.
    analyzeButton.addEventListener('click', () => {
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const logText = e.target?.result as string;
                tokenList = parseLog(logText);
                frequencyMap = analyzeLog(tokenList);
                displayAnalysis(frequencyMap);
            };
            reader.readAsText(file);
        } else {
            outputDiv.textContent = 'Please select a log file to analyze.\nファイルを選択してください。';
        }
    });

    // Event listener for generating heatmap button.
    heatmapButton.addEventListener('click', () => {
        if (frequencyMap.size === 0) {
            outputDiv.textContent = 'No log data available. Please analyze a log file first.\nデータがありません。先にファイルを解析してください。';
            return;
        }
        if (layouts.length === 0) {
            outputDiv.textContent = 'Layouts not loaded. Please check your layout JSON files.\nレイアウトが読み込まれていません。JSONファイルを確認してください。';
            return;
        }
        generateHeatmap(layouts, frequencyMap);
    });

    // Event listener for bigram analysis button.
    bigramButton.addEventListener('click', () => {
        if (tokenList.length === 0) {
            outputDiv.textContent = 'No log data available. Please analyze a log file first.\nデータがありません。先にファイルを解析してください。';
            return;
        }
        const bigramFrequency = analyzeBigrams(tokenList);
        outputDiv.textContent = displayBigrams(bigramFrequency,50);
    });
});
