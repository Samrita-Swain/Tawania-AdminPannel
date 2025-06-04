import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/users
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // For non-admin users, only return basic user info
    const isAdmin = session.user.role === "ADMIN";

    // Parse query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const role = url.searchParams.get("role");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    // Build filters
    const filters: any = {};

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      filters.role = role;
    }

    // Remove isActive filter
    // if (status) {
    //   filters.isActive = status === "active";
    // }

    // Check if the User model exists in Prisma
    if (!('user' in prisma)) {
      // Return empty array if model doesn't exist
      return NextResponse.json({
        users: [],
        pagination: {
          page,
          pageSize,
          totalItems: 0,
          totalPages: 0,
        },
      });
    }

    try {
      // For non-admin users requesting all users (for dropdowns, etc.)
      if (!isAdmin && !search && !role && !status) {
        try {
          // @ts-ignore - Dynamically access the model
          const users = await prisma.user.findMany({
            where: {}, // Remove isActive filter
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
            orderBy: { name: 'asc' },
          });

          return NextResponse.json({ users });
        } catch (err) {
          console.error("Error fetching users for dropdown:", err);
          // Return empty array on error
          return NextResponse.json({ users: [] });
        }
      }

      try {
        // Get users with pagination for admin users
        const [users, totalItems] = await Promise.all([
          // @ts-ignore - Dynamically access the model
          prisma.user.findMany({
            where: filters,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              // Remove isActive
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { name: 'asc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          // @ts-ignore - Dynamically access the model
          prisma.user.count({
            where: filters,
          }),
        ]);

        const totalPages = Math.ceil(totalItems / pageSize);

        return NextResponse.json({
          users,
          pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
          },
        });
      } catch (err) {
        console.error("Error fetching users with pagination:", err);
        // Return empty array on error
        return NextResponse.json({
          users: [],
          pagination: {
            page,
            pageSize,
            totalItems: 0,
            totalPages: 0,
          },
        });
      }
    } catch (error) {
      console.error("Error querying users:", error);
      return NextResponse.json(
        { message: "Failed to query users", error: (error as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Failed to fetch users", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and has admin role
    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the User model exists in Prisma
    if (!('user' in prisma)) {
      return NextResponse.json(
        { message: "User model not available" },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, email, password, role, isActive } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if email is already in use
    // @ts-ignore - Dynamically access the model
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // @ts-ignore - Dynamically access the model
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "STAFF",
        isActive: isActive !== undefined ? isActive : true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Failed to create user", error: (error as Error).message },
      { status: 500 }
    );
  }
}





