import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

// --- CONFIGURACIÓN ---
// Usa variables de entorno en Render para mayor seguridad
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "7723354766:AAHa552gQdu4VDZXOkm8AF4n_y6UYf-9YWQ";
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
    "fantasy": " epic fantasy, vibrant colors, surreal composition",
    "anime": " anime style, vibrant colors, detailed characters, Japanese animation",
    "cyberpunk": " cyberpunk, neon lights, futuristic city, high tech low life"
};

// Modelos disponibles
const availableModels = ["flux", "kontext", "turbo", "nanobanana", "blueberry", "pearl"];

// Inicializar bot
console.log("🚀 Inicializando bot de Telegram...");
const bot = new TelegramBot(TELEGRAM_TOKEN, { 
    polling: true,
    // Configuraciones adicionales para mejor rendimiento
    onlyFirstMatch: true,
    request: {
        timeout: 60000, // 60 segundos para imágenes grandes
        url: 'https://api.telegram.org'
    }
});

// --- FUNCIONES AUXILIARES ---

function getConfigSummary() {
    return `⚙️ Configuración actual:
• Modelo: ${config.model}
• Tamaño: ${config.width}x${config.height}
• Semilla: ${config.seed}
• Estilo: ${config.style ? Object.keys(stylePresets).find(key => stylePresets[key] === config.style) || 'personalizado' : 'ninguno'}`;
}

// --- HANDLERS ---

// Comando /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = `🎨 *Bienvenido al Bot Generador de Imágenes con IA* 🤖

Envía cualquier texto y te generaré una imagen usando inteligencia artificial.

*Comandos disponibles:*
\\- /start - Mostrar este mensaje
\\- /config - Ver configuración actual
\\- /seed \\[número\\|random\\|0\\] - Configurar semilla
\\- /size \\[ancho x alto\\|0\\] - Configurar tamaño
\\- /style \\[estilo\\|0\\] - Configurar estilo visual
\\- /model \\[modelo\\|0\\] - Configurar modelo de IA
\\- /help - Mostrar ayuda

*Ejemplos:*
• "un paisaje montañoso al atardecer"
• "retrato de un gato astronauta"
• /style cinema
• /size 512x512
• /seed random`;

    await bot.sendMessage(chatId, welcomeText, { 
        parse_mode: 'MarkdownV2',
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [{ text: "🎨 Ver estilos" }, { text: "🤖 Ver modelos" }],
                [{ text: "⚙️ Configuración actual" }]
            ]
        }
    });
});

// Comando /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = `*Guía rápida:* 📖

1. *Generar imagen*: Simplemente escribe lo que quieres ver
2. *Cambiar estilo*: Usa /style seguido del nombre del estilo
3. *Cambiar tamaño*: Usa /size seguido de las dimensiones
4. *Cambiar modelo*: Usa /model seguido del nombre del modelo

*Estilos disponibles:* ${Object.keys(stylePresets).join(', ')}
*Modelos disponibles:* ${availableModels.join(', ')}

¿Necesitas más ayuda? ¡Solo pregunta!`;

    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Comando /config
bot.onText(/\/config/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, getConfigSummary());
});

// Comando /seed
bot.onText(/\/seed(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1];

    if (!arg) {
        bot.sendMessage(chatId, "🌱 *Uso del comando /seed:*\n\n• `/seed 1234` - Establecer semilla específica\n• `/seed random` - Semilla aleatoria\n• `/seed 0` - Restablecer a semilla por defecto", { parse_mode: 'Markdown' });
        return;
    }

    if (arg === 'random') {
        config.seed = Math.floor(Math.random() * 9999) + 1;
        bot.sendMessage(chatId, `🎲 Semilla establecida aleatoriamente: \`${config.seed}\``, { parse_mode: 'Markdown' });
    } else if (arg === '0') {
        config.seed = defaultConfig.seed;
        bot.sendMessage(chatId, `🔄 Semilla restablecida a la por defecto: \`${config.seed}\``, { parse_mode: 'Markdown' });
    } else if (/^\d+$/.test(arg) && parseInt(arg) >= 1 && parseInt(arg) <= 9999) {
        config.seed = parseInt(arg);
        bot.sendMessage(chatId, `✅ Semilla establecida a: \`${config.seed}\``, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, "❌ Por favor, usa un número del 1 al 9999 o 'random'.");
    }
});

// Comando /size
bot.onText(/\/size(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1];

    if (!args) {
        bot.sendMessage(chatId, "📐 *Uso del comando /size:*\n\n• `/size 512x512` - Establecer tamaño\n• `/size 0` - Restablecer tamaño por defecto\n• *Rango permitido:* 64-1024 píxeles", { parse_mode: 'Markdown' });
        return;
    }

    if (args === '0') {
        config.width = defaultConfig.width;
        config.height = defaultConfig.height;
        bot.sendMessage(chatId, `🔄 Tamaño restablecido a: \`${defaultConfig.width} x ${defaultConfig.height}px\``, { parse_mode: 'Markdown' });
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
            bot.sendMessage(chatId, `✅ Tamaño actualizado a: \`${width} x ${height}px\``, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, "❌ Las dimensiones deben estar entre 64 y 1024 píxeles.");
        }
    } else {
        bot.sendMessage(chatId, "❌ Formato inválido. Usa `/size 512x512` o `/size 0` para restablecer.", { parse_mode: 'Markdown' });
    }
});

// Comando /style
bot.onText(/\/style(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1];

    if (!arg) {
        const estilos = Object.keys(stylePresets).map(key => `• ${key}`).join('\n');
        bot.sendMessage(chatId, `🎨 *Estilos disponibles:*\n\n${estilos}\n\nUsa \`/style nombre_estilo\` para aplicarlo o \`/style 0\` para quitarlo.`, { parse_mode: 'Markdown' });
        return;
    }

    const styleKey = arg.toLowerCase();
    
    if (styleKey === '0') {
        config.style = "";
        bot.sendMessage(chatId, "🔄 Estilo visual restablecido (sin estilo aplicado).");
    } else if (stylePresets[styleKey]) {
        config.style = stylePresets[styleKey];
        bot.sendMessage(chatId, `✅ Estilo visual establecido a: *${styleKey}*`, { parse_mode: 'Markdown' });
    } else {
        const estilos = Object.keys(stylePresets).map(key => `• ${key}`).join('\n');
        bot.sendMessage(chatId, `❌ Estilo no reconocido.\n\n*Estilos disponibles:*\n${estilos}`, { parse_mode: 'Markdown' });
    }
});

// Comando /model
bot.onText(/\/model(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1];

    if (!arg) {
        const modelos = availableModels.map(m => `• ${m}`).join('\n');
        bot.sendMessage(chatId, `🤖 *Modelos disponibles:*\n\n${modelos}\n\nUsa \`/model nombre_modelo\` para aplicarlo o \`/model 0\` para restablecer.`, { parse_mode: 'Markdown' });
        return;
    }

    const modelKey = arg.toLowerCase();
    
    if (modelKey === '0') {
        config.model = defaultConfig.model;
        bot.sendMessage(chatId, `🔄 Modelo restablecido a: *${defaultConfig.model}*`, { parse_mode: 'Markdown' });
    } else if (availableModels.includes(modelKey)) {
        config.model = modelKey;
        bot.sendMessage(chatId, `✅ Modelo actualizado a: *${modelKey}*`, { parse_mode: 'Markdown' });
    } else {
        const modelos = availableModels.map(m => `• ${m}`).join('\n');
        bot.sendMessage(chatId, `❌ Modelo no reconocido.\n\n*Modelos disponibles:*\n${modelos}`, { parse_mode: 'Markdown' });
    }
});

// Botones interactivos
bot.onText(/🎨 Ver estilos/, (msg) => {
    const chatId = msg.chat.id;
    const estilos = Object.keys(stylePresets).map(key => `• ${key}`).join('\n');
    bot.sendMessage(chatId, `🎨 *Estilos disponibles:*\n\n${estilos}\n\nUsa \`/style nombre_estilo\` para aplicarlo.`, { parse_mode: 'Markdown' });
});

bot.onText(/🤖 Ver modelos/, (msg) => {
    const chatId = msg.chat.id;
    const modelos = availableModels.map(m => `• ${m}`).join('\n');
    bot.sendMessage(chatId, `🤖 *Modelos disponibles:*\n\n${modelos}\n\nUsa \`/model nombre_modelo\` para aplicarlo.`, { parse_mode: 'Markdown' });
});

bot.onText(/⚙️ Configuración actual/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, getConfigSummary());
});

// Generar imagen desde texto
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignorar comandos y mensajes que no son texto
    if (!text || text.startsWith('/') || 
        text === '🎨 Ver estilos' || 
        text === '🤖 Ver modelos' || 
        text === '⚙️ Configuración actual') {
        return;
    }

    try {
        const processingMsg = await bot.sendMessage(chatId, "⏳ *Generando tu imagen...*\n\nEsto puede tomar unos segundos ⏰", { parse_mode: 'Markdown' });

        const styledPrompt = config.style ? `${text}${config.style}` : text;
        const encodedPrompt = encodeURIComponent(styledPrompt);
        const url = `${BASE_URL}/prompt/${encodedPrompt}?model=${config.model}&width=${config.width}&height=${config.height}&seed=${config.seed}&nologo=true`;

        console.log(`🖼️  Generando imagen para: "${text}"`);
        console.log(`🔗 URL: ${url}`);

        // Verificar que la URL sea accesible
        try {
            const response = await axios.head(url, { timeout: 30000 });
            console.log(`✅ URL accesible, status: ${response.status}`);
        } catch (error) {
            console.log(`⚠️  Advertencia en HEAD request: ${error.message}`);
        }

        // Enviar la imagen
        await bot.sendPhoto(chatId, url, {
            caption: `🎨 *Imagen generada para:* "${text}"\n🤖 *Modelo:* ${config.model}\n📐 *Tamaño:* ${config.width}x${config.height}px\n🌱 *Semilla:* ${config.seed}`,
            parse_mode: 'Markdown'
        });

        // Eliminar mensaje de "Generando..."
        await bot.deleteMessage(chatId, processingMsg.message_id);

    } catch (error) {
        console.error("❌ Error generando la imagen:", error);
        
        // Intentar eliminar el mensaje de "Generando..." si existe
        try {
            if (processingMsg) {
                await bot.deleteMessage(chatId, processingMsg.message_id);
            }
        } catch (deleteError) {
            console.log("No se pudo eliminar el mensaje de procesamiento");
        }
        
        let errorMessage = "❌ Error generando la imagen. ";
        
        if (error.code === 'ETELEGRAM') {
            errorMessage += "El archivo de imagen es muy grande para Telegram.";
        } else if (error.response) {
            errorMessage += `Error del servidor: ${error.response.status}`;
        } else if (error.request) {
            errorMessage += "No se pudo conectar al servicio de imágenes.";
        } else {
            errorMessage += "Intenta con un prompt diferente.";
        }
        
        await bot.sendMessage(chatId, errorMessage);
    }
});

// --- MANEJO DE ERRORES Y SEÑALES ---

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

// Manejo graceful de shutdown
process.on('SIGINT', () => {
    console.log('🛑 Recibida señal SIGINT. Cerrando bot...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal SIGTERM. Cerrando bot...');
    bot.stopPolling();
    process.exit(0);
});

// --- INICIALIZACIÓN ---
console.log("🤖 Bot de Telegram inicializado correctamente");
console.log("📋 Comandos disponibles:");
console.log("  • /start - Iniciar bot");
console.log("  • /config - Ver configuración actual");
console.log("  • /seed [número|random|0] - Configurar semilla");
console.log("  • /size [ancho x alto|0] - Configurar tamaño");
console.log("  • /style [estilo|0] - Configurar estilo visual");
console.log("  • /model [modelo|0] - Configurar modelo de IA");
console.log("  • /help - Mostrar ayuda completa");
console.log("  • Enviar cualquier texto para generar una imagen");
console.log("=====================================");
console.log("✅ Bot listo y escuchando mensajes...");