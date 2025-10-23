import { db } from '@/db';
import { publicProcedure, privateProcedure, router } from './trpc';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { absoluteUrl } from '@/lib/utils'




export const appRouter = router({
  test: publicProcedure.query(()=>{
    return 'hello'
  }),
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession()
    const user = await getUser()
    if(user){
        if (!user.id || !user.email)
        throw new TRPCError({ code: 'UNAUTHORIZED' })

        // check if the user is in the database
        const dbUser = await db.user.findFirst({
        where: {
            id: user.id,
        },
        })

        if (!dbUser) {
        // create user in db
        await db.user.create({
            data: {
            id: user.id,
            email: user.email,
            firstName: user.given_name??'userf',
            lastName: user.family_name??'userl',
            },
        })
        }

        return { success: true }
    }else{
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
  }),
    getUserFiles: privateProcedure.query(async ({ ctx }) => {
    const { userId } = ctx

    return await db.file.findMany({
      where: {
        userId,
      },
    })
  }),



  getFileUploadStatus: privateProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input, ctx }) => {
      const file = await db.file.findFirst({
        where: {
          id: input.fileId,
          userId: ctx.userId,
        },
      })

      if (!file) return { status: 'PENDING' as const }

      return { status: file.uploadStatus }
    }),

  getFile: privateProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const file = await db.file.findFirst({
        where: {
          key: input.key,
          userId,
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' })

      return file
    }),

  deleteFile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const file = await db.file.findFirst({
        where: {
          id: input.id,
          userId,
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' })

      await db.file.delete({
        where: {
          id: input.id,
        },
      })

      return file
    }),
})

export type AppRouter = typeof appRouter