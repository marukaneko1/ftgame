import { Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";
import { TokenPackDto } from "./dto/token-pack.dto";
import { Request } from "express";

@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtPayload) {
    return this.walletService.getWallet(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("token-pack")
  async tokenPack(@CurrentUser() user: JwtPayload, @Body() dto: TokenPackDto) {
    return this.walletService.createTokenPackCheckout(user.sub, dto.packId);
  }

  @Post("stripe/webhook")
  async stripeWebhook(@Req() req: Request, @Headers("stripe-signature") signature: string) {
    return this.walletService.handleStripeWebhook(req.body as Buffer, signature);
  }
}

