import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserPayload {
    id: string,
    login: string,
    role: string
}

export const CurrentUser = createParamDecorator((data: unknown , ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
})