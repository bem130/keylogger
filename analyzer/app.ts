// app.ts
// This TypeScript code reads a key log file, performs frequency analysis,
// and generates a heatmap on an HTML canvas based on key frequencies.

// DOMContentLoaded event ensures the DOM is fully loaded before executing the script.
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const analyzeButton = document.getElementById('analyzeButton') as HTMLButtonElement;
    const heatmapButton = document.getElementById('heatmapButton') as HTMLButtonElement;
    const outputDiv = document.getElementById('output') as HTMLDivElement;
    const canvas = document.getElementById('heatmapCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    // We'll store the analysis results here for generating the heatmap.
    let frequencyMap: Map<string, number> = new Map();

    /**
     * Keyboard layout data based on your custom arrangement.
     * 
     * Row 1: 1 2 3 4 5 6 \ 7 8 9 0 - ^
     * Row 2: q o e , . : w d k s t [
     * Row 3: a u i f z ; r j h l y ]
     * Row 4: / x c v \ b n m g p @
     * 
     * The 'x' and 'y' coordinates are approximate. Feel free to adjust them.
     */
    const KEY_LAYOUT = [
        // Row 1 (13 keys)
        { key: '1', x:  50, y: 50 },
        { key: '2', x: 100, y: 50 },
        { key: '3', x: 150, y: 50 },
        { key: '4', x: 200, y: 50 },
        { key: '5', x: 250, y: 50 },
        { key: '6', x: 300, y: 50 },
        { key: '\\', x: 350, y: 50 },
        { key: '7', x: 400, y: 50 },
        { key: '8', x: 450, y: 50 },
        { key: '9', x: 500, y: 50 },
        { key: '0', x: 550, y: 50 },
        { key: '-', x: 600, y: 50 },
        { key: '^', x: 650, y: 50 },

        // Row 2 (12 keys)
        { key: 'q', x:  60, y: 100 },
        { key: 'o', x: 110, y: 100 },
        { key: 'e', x: 160, y: 100 },
        { key: ',', x: 210, y: 100 },
        { key: '.', x: 260, y: 100 },
        { key: ':', x: 310, y: 100 },
        { key: 'w', x: 360, y: 100 },
        { key: 'd', x: 410, y: 100 },
        { key: 'k', x: 460, y: 100 },
        { key: 's', x: 510, y: 100 },
        { key: 't', x: 560, y: 100 },
        { key: '[', x: 610, y: 100 },

        // Row 3 (12 keys)
        { key: 'a', x:  60, y: 150 },
        { key: 'u', x: 110, y: 150 },
        { key: 'i', x: 160, y: 150 },
        { key: 'f', x: 210, y: 150 },
        { key: 'z', x: 260, y: 150 },
        { key: ';', x: 310, y: 150 },
        { key: 'r', x: 360, y: 150 },
        { key: 'j', x: 410, y: 150 },
        { key: 'h', x: 460, y: 150 },
        { key: 'l', x: 510, y: 150 },
        { key: 'y', x: 560, y: 150 },
        { key: ']', x: 610, y: 150 },

        // Row 4 (11 keys)
        { key: '/', x:  70, y: 200 },
        { key: 'x', x: 120, y: 200 },
        { key: 'c', x: 170, y: 200 },
        { key: 'v', x: 220, y: 200 },
        { key: '\\', x: 270, y: 200 }, // Another backslash
        { key: 'b', x: 320, y: 200 },
        { key: 'n', x: 370, y: 200 },
        { key: 'm', x: 420, y: 200 },
        { key: 'g', x: 470, y: 200 },
        { key: 'p', x: 520, y: 200 },
        { key: '@', x: 570, y: 200 },
    ];

    /**
     * Parses the key log text into individual tokens.
     * @param logText - The full text content from the key log file.
     * @returns An array of key event tokens.
     */
    function parseLog(logText: string): string[] {
        // Split by any whitespace (spaces, newlines) and filter out empty tokens.
        return logText.split(/\s+/).filter(token => token.length > 0);
    }

    /**
     * Analyzes the frequency of each key event in the log.
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
     * Displays the frequency analysis results in text form.
     * For a bilingual approach, replicate or append the output in Japanese if desired.
     */
    function displayAnalysis(map: Map<string, number>) {
        // Sort entries in descending order by frequency
        const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
        let text = 'Key Event Frequency Analysis:\n';
        text += '-------------------------------\n';
        for (const [key, count] of entries) {
            text += `${key}: ${count}\n`;
        }
        outputDiv.textContent = text;
    }

    /**
     * Generates a heatmap on the canvas based on the frequencyMap.
     * The higher the frequency, the "hotter" (e.g. red) the color.
     */
    function generateHeatmap(map: Map<string, number>) {
        if (!ctx) return;

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Find the maximum frequency
        let maxFreq = 0;
        for (const [, count] of map) {
            if (count > maxFreq) {
                maxFreq = count;
            }
        }

        // Draw each key as a circle with color based on frequency
        KEY_LAYOUT.forEach((layout) => {
            const freq = map.get(layout.key) || 0;
            // Calculate a ratio from 0.0 to 1.0
            const ratio = maxFreq === 0 ? 0 : freq / maxFreq;

            // Color gradient: from blue (low freq) to red (high freq)
            const hue = 240 - Math.floor(240 * ratio);
            const color = `hsl(${hue}, 100%, 50%)`;

            // Draw the circle
            const radius = 20;
            ctx.beginPath();
            ctx.arc(layout.x, layout.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();

            // Draw the key label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(layout.key, layout.x, layout.y);
        });
    }

    // Button event: Analyze the log file
    analyzeButton.addEventListener('click', () => {
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const logText = e.target?.result as string;
                frequencyMap = analyzeLog(parseLog(logText));
                displayAnalysis(frequencyMap);
            };
            reader.readAsText(file);
        } else {
            outputDiv.textContent = 'Please select a file to analyze.\nファイルを選択してください。';
        }
    });

    // Button event: Generate the heatmap
    heatmapButton.addEventListener('click', () => {
        if (frequencyMap.size === 0) {
            outputDiv.textContent = 'No data to display. Please analyze a log file first.\n' +
                                    'データがありません。先にファイルを解析してください。';
            return;
        }
        generateHeatmap(frequencyMap);
    });
});
