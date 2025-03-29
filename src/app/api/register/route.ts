import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const TRIAL_PERIOD_DAYS = 7; // Define trial duration

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // 1. Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Mangler påkrevde felter' }, { status: 400 });
    }

    // Basic email validation (consider a more robust library for production)
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Ugyldig e-postformat' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Passordet må være minst 8 tegn' }, { status: 400 });
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'E-postadressen er allerede registrert' }, { status: 409 }); // 409 Conflict
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_PERIOD_DAYS);

    // 4. Create new user with trial end date
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        trialEndsAt, // Set the trial end date
      },
    });

    // 5. Return success response (don't include password)
    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 } // 201 Created
    );

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 });
  }
} 