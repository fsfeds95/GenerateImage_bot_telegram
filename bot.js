const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

// --- CONFIGURACIÓN ---
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "7723354766:AAGbWFlxNy4a6hUvmZTeXoHTUnIXB1f0HcI";
const BASE_URL = "https://image.pollinations.ai";

// Configuración global
let config = {
    seed: 42,
    width: 1024,
    height: 1024,
    style: "",
    model: "turbo"
};

// Valores por defecto
const defaultConfig = {
    seed: 42,
    width: 1024,
    height: 1024,
    style: "",
    model: "turbo"
};

// Estilos predefinidos
const stylePresets = {
    "cinema": " Shot in native IMAX 65mm and ARRI ALEXA LF with anamorphic lenses, color graded in HDR10/Dolby Vision, mastered in 4K DCI, utilizing dynamic lighting, practical effects, deep depth of field, authentic set design, golden hour cinematography, and multi-cam Steadicam, drone, and gimbal setups for immersive wide-to-intimate shots",
    "realistic": " real life intricate footage scene captured photo",
    "photography": " hyperrealistic professional ultra intricately detailed photography ",
    "fantasy": " epic fantasy, vibrant colors, surreal composition"
};

// Modelos disponibles
const availableModels = ["flux", "kontext", "turbo", "nanobanana"];

// Inicializar bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// --- HANDLERS ---

// Comando /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Hola! Envíame un texto y te genero una imagen con IA.");
});

// Comando /seed
bot.onText(/\/seed(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1];

    if (!arg) {
        bot.sendMessage(chatId, "Por favor, proporciona una semilla. Ejemplo: /seed 1234 o /seed random");
        return;
    }

    if (arg === 'random') {
        config.seed = Math.floor(Math.random() * 9999) + 1;
        bot.sendMessage(chatId, `Semilla establecida aleatoriamente: ${config.seed}`);
    } else if (arg === '0') {
        config.seed = defaultConfig.seed;
        bot.sendMessage(chatId, `Semilla restablecida a la por defecto: ${config.seed}`);
    } else if (/^\d+$/.test(arg) && parseInt(arg) >= 1 && parseInt(arg) <= 9999) {
        config.seed = parseInt(arg);
        bot.sendMessage(chatId, `Semilla establecida a: ${config.seed}`);
    } else {
        bot.sendMessage(chatId, "Por favor, usa un número del 1 al 9999 o 'random'.");
    }
});

// Comando /size
bot.onText(/\/size(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1];

    if (!args) {
        bot.sendMessage(chatId, "Por favor, proporciona un tamaño. Ejemplo: /size 512x512 o /size 0");
        return;
    }

    if (args === '0') {
        config.width = defaultConfig.width;
        config.height = defaultConfig.height;
        bot.sendMessage(chatId, `Tamaño restablecido a: ${defaultConfig.width} x ${defaultConfig.height}px`);
        return;
    }

    // Procesar formato: 512x512, 512 x 512, 800x600, etc.
    const sizeMatch = args.replace(/\s/g, '').match(/^(\d+)x(\d+)$/);
    
    if (sizeMatch) {
        const width = parseInt(sizeMatch[1]);
        const height = parseInt(sizeMatch[2]);
        
        if (width >= 64 && width <= 1024 && height >= 64 && height <= 1024) {
            config.width = width;
            config.height = height;
            bot.sendMessage(chatId, `Tamaño actualizado a: ${width} x ${height}px`);
        } else {
            bot.sendMessage(chatId, "Las dimensiones deben estar entre 64 y 1024 píxeles.");
        }
    } else {
        bot.sendMessage(chatId, "Formato inválido. Usa `/size 512x512` o `/size 0` para restablecer.");
    }
});

// Comando /style
bot.onText(/\/style(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1];

    if (!arg) {
        const estilos = Object.keys(stylePresets).map(key => `- ${key}`).join('\n');
        bot.sendMessage(chatId, `Estilos disponibles:\n${estilos}\n\nUsa /style nombre_estilo para aplicarlo o /style 0 para quitarlo.`);
        return;
    }

    if (arg === '0') {
        config.style = "";
        bot.sendMessage(chatId, "Estilo visual restablecido.");
    } else if (stylePresets[arg.toLowerCase()]) {
        config.style = stylePresets[arg.toLowerCase()];
        bot.sendMessage(chatId, `Estilo visual establecido a: ${arg}`);
    } else {
        bot.sendMessage(chatId, "Estilo no reconocido. Usa `/style` para ver los estilos disponibles.");
    }
});

// Comando /model
bot.onText(/\/model(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1];

    if (!arg) {
        const modelos = availableModels.map(m => `- ${m}`).join('\n');
        bot.sendMessage(chatId, `Modelos disponibles:\n${modelos}\n\nUsa /model nombre_modelo para aplicarlo o /model 0 para restablecer.`);
        return;
    }

    if (arg === '0') {
        config.model = defaultConfig.model;
        bot.sendMessage(chatId, `Modelo restablecido a: ${defaultConfig.model}`);
    } else if (availableModels.includes(arg.toLowerCase())) {
        config.model = arg.toLowerCase();
        bot.sendMessage(chatId, `Modelo actualizado a: ${arg}`);
    } else {
        const modelos = availableModels.map(m => `- ${m}`).join('\n');
        bot.sendMessage(chatId, `Modelo no reconocido. Modelos disponibles:\n${modelos}\n\nUsa /model nombre_modelo o /model 0 para restablecer.`);
    }
});

// Generar imagen desde texto
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignorar comandos y mensajes que no son texto
    if (!text || text.startsWith('/')) {
        return;
    }

    try {
        await bot.sendMessage(chatId, "⏳ Generando tu imagen...");

        const styledPrompt = config.style ? `${text}${config.style}` : text;
        const url = `${BASE_URL}/prompt/${encodeURIComponent(styledPrompt)}?model=${config.model}&width=${config.width}&height=${config.height}&seed=${config.seed}&nologo=true`;

        // Enviar la imagen
        await bot.sendPhoto(chatId, url, {
            caption: `Imagen generada para: "${text}"\nModelo: ${config.model}\nTamaño: ${config.width}x${config.height}px\nSemilla: ${config.seed}`
        });

    } catch (error) {
        console.error("Error generando la imagen:", error);
        await bot.sendMessage(chatId, "❌ Error generando la imagen. Intenta de nuevo.");
    }
});

// Manejo de errores
bot.on('polling_error', (error) => {
    console.error('Error en el polling:', error);
});

bot.on('webhook_error', (error) => {
    console.error('Error en el webhook:', error);
});

// Inicialización
console.log("🤖 Bot en ejecución...");
console.log("Comandos disponibles:");
console.log("- /start - Iniciar bot");
console.log("- /seed [número|random|0] - Configurar semilla");
console.log("- /size [ancho x alto|0] - Configurar tamaño");
console.log("- /style [estilo|0] - Configurar estilo visual");
console.log("- /model [modelo|0] - Configurar modelo de IA");
console.log("- Enviar cualquier texto para generar una imagen");
