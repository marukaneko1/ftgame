import { Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";
import { Request } from "express";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getMySubscription(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("basic/create-checkout-session")
  async basicCheckout(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.createBasicCheckoutSession(user.sub);
  }

  @Post("webhook")
  async webhook(@Req() req: Request, @Headers("stripe-signature") signature: string) {
    return this.subscriptionsService.handleWebhook(req.body as Buffer, signature);
  }
}

