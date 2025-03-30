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
    // Properly await params before accessing properties
    const resolvedParams = params instanceof Promise ? await params : params;
    batchId = resolvedParams.batchId;

    if (typeof batchId !== 'string' || batchId.length === 0) {
      console.error("WidgetTestPage: Failed to extract string batchId from params:", resolvedParams);
      return (
           <div className="container mx-auto p-6 text-center">
               <h1 className="text-xl font-semibold text-red-600">Invalid Page URL</h1>
               <p className="mt-2 text-gray-700">Could not read the batch ID from the URL parameters.</p>
           </div>
       );
    }
    console.log("DEBUG: WidgetTestPage successfully extracted batchId:", batchId);

    // --- Zod Validation Removed (remains removed) ---

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
     let logBatchId = 'unknown';
     try {
       const resolvedParams = params instanceof Promise ? await params : params;
       logBatchId = resolvedParams.batchId || 'unknown';
     } catch (paramsError) {
       console.error('WidgetTestPage: Error accessing batch ID for logging:', paramsError);
     }
     console.error(`Error in WidgetTestPage for batch ID ${logBatchId}:`, error);
      return (
         <div className="container mx-auto p-6 text-center">
             <h1 className="text-xl font-semibold text-red-600">Server Error</h1>
             <p className="mt-2 text-gray-700">An error occurred while loading the test page. Please try again later.</p>
         </div>
     );
  }
}

// Metadata function needs the same fix
export async function generateMetadata({ params }: { params: { batchId: string } }) {
  let batchId = 'Invalid Batch';
  try {
    // Properly await params before accessing properties
    const resolvedParams = params instanceof Promise ? await params : params;
    const potentialBatchId = resolvedParams.batchId;

    if (typeof potentialBatchId === 'string' && potentialBatchId.length > 0) {
        batchId = potentialBatchId;
    } else {
        console.error("generateMetadata: Failed to extract valid string batchId from params:", resolvedParams);
    }
  } catch (error) {
      console.error("generateMetadata: Error resolving params:", error);
  }

  // Fetch title securely if needed, otherwise use ID
  // Example: const batch = await prisma.jobBatch.findUnique({ where: {id: batchId}, select: {title: true}}); const title = batch?.title || batchId;
  return {
    title: `Widget Test - Batch ${batchId}`,
  };
} 