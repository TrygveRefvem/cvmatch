// src/app/api/seeker/profile/cv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path as necessary
import { PrismaClient } from '@prisma/client';
import { Buffer } from 'buffer';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

const prisma = new PrismaClient();

// --- Helper: Text Extraction Function (Simplified from add-candidate) ---
async function extractCvText(cvFile: File): Promise<string> {
    const cvBuffer = await cvFile.arrayBuffer();
    let rawCvText = '';

    try {
        if (cvFile.type === 'application/pdf') {
            const data = await pdf(Buffer.from(cvBuffer));
            rawCvText = data.text;
        } else if (cvFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const { value } = await mammoth.extractRawText({ buffer: Buffer.from(cvBuffer) });
            rawCvText = value;
        } else if (cvFile.type === 'text/plain') {
            rawCvText = Buffer.from(cvBuffer).toString('utf-8');
        } else {
            console.warn(`Unsupported CV file type: ${cvFile.type}. Attempting plain text extraction.`);
            // Fallback attempt for unknown types
            rawCvText = Buffer.from(cvBuffer).toString('utf-8');
        }
    } catch (parsingError: any) {
        console.error(`Error parsing CV file (${cvFile.type}):`, parsingError);
        throw new Error(`Kunne ikke hente ut tekst fra CV-fil (${cvFile.type}): ${parsingError.message || 'Ukjent parsefeil'}`);
    }

    if (!rawCvText) {
        throw new Error('Kunne ikke hente ut tekst fra CV-filen etter parsing.');
    }
     // Basic sanitization - remove null characters which can cause DB issues
    return rawCvText.replace(/\0/g, '');
}


// --- API Route Handler (POST) ---
export async function POST(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Autentisering påkrevd.' }, { status: 401 });
        }
        const userId = session.user.id;

        // 2. Get File from Form Data
        const formData = await request.formData();
        const cvFile = formData.get('cvFile') as File;

        if (!cvFile || typeof cvFile.size === 'undefined') {
            console.error('Validation failed: cvFile is missing or not a valid File object.', cvFile);
            return NextResponse.json({ error: 'Mangler påkrevd felt: cvFile.' }, { status: 400 });
        }

        console.log(`Processing CV upload for user ${userId}: ${cvFile.name}, Type: ${cvFile.type}`);

        // 3. Extract Text
        const extractedCvText = await extractCvText(cvFile);
        if (!extractedCvText) { // Double check after extraction
             throw new Error('Klarte ikke å hente ut tekst fra filen.');
        }

        // TODO: Consider adding text length check/truncation if necessary
        // const MAX_CV_TEXT_LENGTH = 20000; // Example limit
        // const cvTextToSave = truncateText(extractedCvText, MAX_CV_TEXT_LENGTH);

        // 4. Save to Database (Upsert Profile)
        const profile = await prisma.jobSeekerProfile.upsert({
            where: { userId: userId },
            update: {
                cvText: extractedCvText,
                // Add filename, upload date later?
            },
            create: {
                userId: userId,
                cvText: extractedCvText,
            },
            select: { // Select the data needed for the response
                 cvText: true
             }
        });

        console.log(`Successfully updated/created JobSeekerProfile for user ${userId}`);

        // 5. Return Success Response
        return NextResponse.json({
             success: true,
             message: 'CV lastet opp og lagret!',
             cvText: profile.cvText // Return the saved text
         }, { status: 200 });

    } catch (error: any) {
        console.error(`Error uploading CV for user: ${error.message}`, { error });
        return NextResponse.json({ error: `Opplasting feilet: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
    }
}

// TODO: Implement GET handler later to fetch the profile
export async function GET(request: NextRequest) {
    // Placeholder for fetching the profile data
    return NextResponse.json({ message: "GET method not implemented yet." }, { status: 501 });
}