import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/db";


const f = createUploadthing();


export const ourFileRouter = {

    pdfUploader: f({
    pdf: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
        const { getUser } = getKindeServerSession()
        const user = await getUser()

        if (!user || !user.id) throw new Error('Unauthorized')

        //const subscriptionPlan = await getUserSubscriptionPlan()

        return { /*subscriptionPlan, */userId: user.id }

    })
    .onUploadComplete(async ({ metadata, file }) => {
        const createdFile = await db.file.create({
            data: {
                key: file.key,
                name: file.name,
                userId: metadata.userId,
                url:  `https://aly3srcyyg.ufs.sh/f/${file.key}`,
                uploadStatus: "PROCESSING"
            }
        })
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
  