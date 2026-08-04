import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { message } from 'telegraf/filters';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf<Context>;
  private isRunning = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.initializeBot();
  }

  async onModuleDestroy() {
    if (this.bot) {
      await this.stopBot();
    }
  }

  private async initializeBot() {
    const token = await this.getBotToken();
    
    if (!token) {
      console.log('⚠️  Bot token not configured');
      return;
    }

    this.bot = new Telegraf(token);

    // Start command
    this.bot.start(async (ctx) => {
      await this.handleStart(ctx);
    });

    // Search command
    this.bot.command('search', async (ctx) => {
      await this.handleSearch(ctx);
    });

    // Categories command
    this.bot.command('categories', async (ctx) => {
      await this.handleCategories(ctx);
    });

    // Latest movies
    this.bot.command('latest', async (ctx) => {
      await this.handleLatest(ctx);
    });

    // Random movie
    this.bot.command('random', async (ctx) => {
      await this.handleRandom(ctx);
    });

    // My profile
    this.bot.command('profile', async (ctx) => {
      await this.handleProfile(ctx);
    });

    // Favorites
    this.bot.command('favorites', async (ctx) => {
      await this.handleFavorites(ctx);
    });

    // Help
    this.bot.help(async (ctx) => {
      await this.handleHelp(ctx);
    });

    // Handle text messages for search
    this.bot.on(message('text'), async (ctx) => {
      await this.handleTextMessage(ctx);
    });

    // Handle callback queries
    this.bot.on('callback_query', async (ctx) => {
      await this.handleCallbackQuery(ctx);
    });

    try {
      await this.bot.launch();
      this.isRunning = true;
      console.log(`✅ Bot started: @${(await this.bot.telegram.getMe()).username}`);
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
    }
  }

  async restartBot() {
    if (this.bot && this.isRunning) {
      await this.stopBot();
    }
    await this.initializeBot();
  }

  private async stopBot() {
    if (this.bot) {
      await this.bot.stop('Bot stopping');
      this.isRunning = false;
    }
  }

  private async getBotToken(): Promise<string | null> {
    const setting = await this.prisma.botSetting.findUnique({
      where: { key: 'BOT_TOKEN' },
    });
    return setting?.value || this.configService.get('TELEGRAM_BOT_TOKEN') || null;
  }

  private async handleStart(ctx: Context) {
    const telegramId = ctx.from.id;
    
    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      // Parse referral code from start payload
      const referralCode = ctx.startPayload;
      
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(telegramId),
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          referredBy: referralCode || undefined,
        },
      });

      // Update referrer's bonus
      if (referralCode) {
        await this.prisma.user.update({
          where: { referralCode },
          data: { bonusPoints: { increment: 100 } },
        });
      }
    }

    // Check mandatory subscription
    const requiresSubscription = await this.checkMandatorySubscription(ctx);
    
    if (requiresSubscription) {
      return;
    }

    await ctx.reply(
      `👋 Assalomu alaykum, ${ctx.from.first_name}!\n\n` +
      `🎬 Movie Bot ga xush kelibsiz!\n\n` +
      `📌 Buyruqlar:\n` +
      `/search - Kino qidirish\n` +
      `/categories - Kategoriyalar\n` +
      `/latest - So'nggi kinolar\n` +
      `/random - Tasodifiy kino\n` +
      `/profile - Mening profilim\n` +
      `/favorites - Sevimlilar\n` +
      `/help - Yordam`,
      Markup.keyboard([
        ['🔍 Qidirish', '📂 Kategoriyalar'],
        ['🆕 Soʻnggi', '🎲 Tasodifiy'],
        ['👤 Profilim', '❤️ Sevimlilar'],
      ]).resize(),
    );
  }

  private async handleSearch(ctx: Context) {
    await ctx.reply('🔍 Kino nomini yoki kodini yuboring:');
  }

  private async handleCategories(ctx: Context) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    const buttons = categories.map((cat) => [cat.name]);
    
    await ctx.reply(
      '📂 Kategoriyalar:',
      Markup.keyboard(buttons).resize(),
    );
  }

  private async handleLatest(ctx: Context) {
    const movies = await this.prisma.movie.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    await ctx.reply('🆕 Soʻnggi qoʻshilgan kinolar:');
    
    for (const movie of movies) {
      await this.sendMovieCard(ctx, movie);
    }
  }

  private async handleRandom(ctx: Context) {
    const randomMovie = await this.prisma.movie.findMany({
      where: { isActive: true },
      take: 1,
    });

    if (randomMovie.length > 0) {
      await this.sendMovieCard(ctx, randomMovie[0]);
    } else {
      await ctx.reply('😔 Hozircha kinolar yoʻq');
    }
  }

  private async handleProfile(ctx: Context) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from.id) },
    });

    if (user) {
      await ctx.reply(
        `👤 Profil:\n\n` +
        `📛 Ism: ${user.firstName}\n` +
        `⭐ Bonus: ${user.bonusPoints}\n` +
        `📅 Roʻyxatdan oʻtgan: ${new Date(user.createdAt).toLocaleDateString()}`,
      );
    }
  }

  private async handleFavorites(ctx: Context) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from.id) },
    });

    if (user && user.favorites.length > 0) {
      await ctx.reply(`❤️ Sevimli kinolar: ${user.favorites.length} ta`);
      // Send favorite movies
    } else {
      await ctx.reply('❤️ Hozircha sevimli kinolar yoʻq');
    }
  }

  private async handleHelp(ctx: Context) {
    await ctx.reply(
      `ℹ️ Yordam:\n\n` +
      `🔍 Qidirish - Kino nomi yoki kodi bo'yicha\n` +
      `📂 Kategoriyalar - Barcha kategoriyalar\n` +
      `🆕 So'nggi - Oxirgi qo'shilgan kinolar\n` +
      `🎲 Tasodifiy - Random kino tanlash\n` +
      `👤 Profilim - Foydalanuvchi ma'lumotlari\n` +
      `❤️ Sevimlilar - Saqlangan kinolar`,
    );
  }

  private async handleTextMessage(ctx: Context) {
    const text = ctx.message.text;
    
    // Search by name or code
    const movie = await this.prisma.movie.findFirst({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { code: text },
              { name: { contains: text, mode: 'insensitive' } },
            ],
          },
        ],
      },
    });

    if (movie) {
      await this.sendMovieCard(ctx, movie);
    } else {
      await ctx.reply('😔 Kino topilmadi. Boshqa nom bilan qidiring.');
    }
  }

  private async handleCallbackQuery(ctx: Context) {
    const data = ctx.callbackQuery.data;
    
    // Handle callback actions
    if (data.startsWith('download_')) {
      const movieId = data.split('_')[1];
      await this.handleDownload(ctx, movieId);
    } else if (data.startsWith('favorite_')) {
      const movieId = data.split('_')[1];
      await this.handleToggleFavorite(ctx, movieId);
    }
  }

  private async sendMovieCard(ctx: Context, movie: any) {
    const caption = `
🎬 *${movie.name}*
${movie.originalName ? `📝 Original: ${movie.originalName}` : ''}

📅 Yil: ${movie.year}
🌍 Mamlakat: ${movie.country || 'Noma\'lum'}
⏱ Davomiylik: ${movie.duration ? `${movie.duration} daqiqa` : 'N/A'}
🎭 Janr: ${movie.tags.join(', ') || 'N/A'}
⭐ IMDb: ${movie.imdbRating || 'N/A'}
📦 Fayl: ${movie.fileSize ? this.formatFileSize(Number(movie.fileSize)) : 'N/A'}

📝 Tavsif:
${movie.description || 'Tavsif yo\'q'}
`.trim();

    if (movie.posterUrl) {
      await ctx.replyWithPhoto(
        { url: movie.posterUrl },
        {
          caption,
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback('⬇️ Yuklab olish', `download_${movie.id}`),
              Markup.button.callback('❤️ Sevimli', `favorite_${movie.id}`),
            ],
            movie.trailerUrl
              ? [Markup.button.url('🎬 Trailer', movie.trailerUrl)]
              : [],
          ]),
        },
      );
    } else {
      await ctx.reply(caption, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('⬇️ Yuklab olish', `download_${movie.id}`),
            Markup.button.callback('❤️ Sevimli', `favorite_${movie.id}`),
          ],
        ]),
      });
    }
  }

  private async handleDownload(ctx: Context, movieId: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    
    if (movie && movie.telegramFileId) {
      // Increment download count
      await this.prisma.movie.update({
        where: { id: movieId },
        data: { downloadCount: { increment: 1 } },
      });

      // Create download record
      await this.prisma.download.create({
        data: {
          userId: (await this.prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } }))?.id,
          movieId,
        },
      });

      await ctx.replyWithDocument({ fileId: movie.telegramFileId });
    } else {
      await ctx.reply('😔 Kino yuklab olish uchun mavjud emas');
    }
  }

  private async handleToggleFavorite(ctx: Context, movieId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from.id) },
    });

    if (!user) return;

    const favorites = user.favorites;
    const index = favorites.indexOf(movieId);

    if (index > -1) {
      favorites.splice(index, 1);
      await ctx.answerCbQuery('❤️ Sevimlilardan o\'chirildi');
    } else {
      favorites.push(movieId);
      await ctx.answerCbQuery('❤️ Sevimlilarga qo\'shildi');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { favorites },
    });
  }

  private async checkMandatorySubscription(ctx: Context): Promise<boolean> {
    const channels = await this.prisma.channel.findMany({
      where: { isRequired: true, isActive: true },
    });

    if (channels.length === 0) {
      return false;
    }

    const memberPromises = channels.map((channel) =>
      this.bot.telegram
        .getChatMember(channel.chatId.toString(), ctx.from.id)
        .then((member) => ({ channel, status: member.status }))
        .catch(() => ({ channel, status: 'left' })),
    );

    const members = await Promise.all(memberPromises);
    const notSubscribed = members.filter(
      (m) => !['member', 'administrator', 'creator'].includes(m.status),
    );

    if (notSubscribed.length > 0) {
      const keyboard = Markup.inlineKeyboard(
        notSubscribed.map((m) => [
          Markup.button.url(
            `✅ ${m.channel.title}`,
            `https://t.me/${m.channel.username?.replace('@', '')}`,
          ),
        ]),
      ).appendRow([Markup.button.callback('✅ Tekshirish', 'check_subscription')]);

      await ctx.reply(
        '⚠️ Botdan foydalanish uchun quyidagi kanallarga a\'zo bo\'ling:',
        keyboard,
      );
      return true;
    }

    return false;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async sendMessage(chatId: string, text: string, options?: any) {
    if (this.bot) {
      return this.bot.telegram.sendMessage(chatId, text, options);
    }
  }

  async sendBroadcast(chatIds: string[], text: string, options?: any) {
    const results = { success: 0, failed: 0 };
    
    for (const chatId of chatIds) {
      try {
        await this.sendMessage(chatId, text, options);
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }
}
