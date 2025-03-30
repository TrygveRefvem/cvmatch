import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import WidgetTester from '@/components/recruit/WidgetTester'; // Assume this path is correct
// import { z } from 'zod'; // Remove Zod import

const prisma = new PrismaClient();

// Remove Zod schema
// const ParamsSchema = z.object({
//   batchId: z.string().cuid() 
// });

// Server component to fetch data securely
export default async function WidgetTestPage({ params }: { params: { batchId: string } }) {
  
  console.log("DEBUG: Raw params received by WidgetTestPage:", params);

  let batchId: string;
  try {
    // --- Workaround for receiving Promise as params --- 
    const potentialBatchId = (params as any)?.batchId;
    if (typeof potentialBatchId !== 'string' || potentialBatchId.length === 0) {
        console.error("WidgetTestPage: Failed to extract string batchId from params:", params);
        return (
             <div className="container mx-auto p-6 text-center">
                 <h1 className="text-xl font-semibold text-red-600">Invalid Page URL</h1>
                 <p className="mt-2 text-gray-700">Could not read the batch ID from the URL parameters.</p>
             </div>
         );
    }
    batchId = potentialBatchId;
    console.log("DEBUG: WidgetTestPage successfully extracted batchId:", batchId);
    // --- End Workaround ---

    // --- Zod Validation Removed ---
    // const validatedParams = ParamsSchema.safeParse(params);
    // if (!validatedParams.success) {
    //   console.error("WidgetTestPage: Invalid batch ID format received:", params);
    //   return (
    //       <div className="container mx-auto p-6 text-center">
    //           <h1 className="text-xl font-semibold text-red-600">Invalid Page URL</h1>
    //           <p className="mt-2 text-gray-700">The batch ID in the URL is not valid.</p>
    //       </div>
    //   );
    // }
    // const { batchId } = validatedParams.data; // Use validated batchId

    // --- Continue with the rest of the component logic --- 

    // 1. Auth Check (Ensure user is a recruiter)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return (
          <div className="container mx-auto p-6 text-center">
              <h1 className="text-xl font-semibold text-red-600">Access Denied</h1>
              <p className="mt-2 text-gray-700">You must be logged in as a recruiter to view this test page.</p>
          </div>
      );
    }
    const recruiterUserId = session.user.id;

    // 2. Fetch the specific JobBatch with its widgetToken, ensuring ownership
    let batchData: { id: string, title: string, widgetToken: string | null } | null = null;
    // Fetch logic remains the same, using the extracted batchId
    batchData = await prisma.jobBatch.findUnique({
      where: {
        id: batchId,
        userId: recruiterUserId, 
      },
      select: {
        id: true,
        title: true,
        widgetToken: true,
      },
    });
    
    // 3. Handle Batch Not Found or Missing Token (or DB Error implicitly caught by batchData check)
    if (!batchData) {
      console.log(`WidgetTestPage: Batch not found or access denied for ID: ${batchId}`);
      notFound(); 
    }

    if (!batchData.widgetToken) {
      return (
        <div className="container mx-auto p-6 text-center">
          <h1 className="text-xl font-semibold mb-4">Widget Test for: {batchData.title}</h1>
          <p className="text-orange-600">Denne batchen har ingen widget-token tilknyttet seg.</p>
          <p className="mt-2 text-sm text-gray-600">
              Dette kan skje med batcher opprettet før widget-funksjonen ble lagt til.
              Kun nyere batcher vil ha en token for widget-integrasjon.
          </p>
        </div>
      );
    }

    // 4. Pass data to the Client Component
    return (
       <WidgetTester 
          batchTitle={batchData.title}
          widgetToken={batchData.widgetToken} 
       />
    );

  } catch (error) {
     // Catch potential errors during DB fetch or other async operations
     const logBatchId = (params as any)?.batchId || 'unknown'; 
     console.error(`Error in WidgetTestPage for batch ID ${logBatchId}:`, error);
      return (
         <div className="container mx-auto p-6 text-center">
             <h1 className="text-xl font-semibold text-red-600">Server Error</h1>
             <p className="mt-2 text-gray-700">An error occurred while loading the test page. Please try again later.</p>
         </div>
     );
  }
}

// Metadata function might also need the workaround if it relies on params directly
export async function generateMetadata({ params }: { params: { batchId: string } }) {
  // Apply workaround here too
  const potentialBatchId = (params as any)?.batchId;
  if (typeof potentialBatchId !== 'string' || potentialBatchId.length === 0) {
      return { title: 'Invalid Batch - Widget Test' };
  }
  const batchId = potentialBatchId;
  
  // Fetch title securely if needed, otherwise use ID
  // Example: const batch = await prisma.jobBatch.findUnique({ where: {id: batchId}, select: {title: true}}); const title = batch?.title || batchId;
  return {
    title: `Widget Test - Batch ${batchId}`,
  };
} 