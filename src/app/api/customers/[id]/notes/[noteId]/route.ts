import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: customerId, noteId } = params;

    // Use type assertion to bypass TypeScript errors
    const note = await (prisma as any).customerNote.findFirst({
      where: {
        id: noteId,
        customerId: customerId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    // Verify note belongs to customer
    if (note.customerId !== customerId) {
      return NextResponse.json(
        { error: "Note does not belong to this customer" },
        { status: 403 }
      );
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: customerId, noteId } = params;
    const data = await req.json();
    const { note: noteContent } = data;

    // Validate required fields
    if (!noteContent) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Check if note exists
    const existingNote = await (prisma as any).customerNote.findFirst({
      where: {
        id: noteId,
        customerId: customerId,
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    // Verify note belongs to customer
    if (existingNote.customerId !== customerId) {
      return NextResponse.json(
        { error: "Note does not belong to this customer" },
        { status: 403 }
      );
    }

    // Verify user is the creator of the note
    if (existingNote.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit notes that you created" },
        { status: 403 }
      );
    }

    // Update note
    const updatedNote = await (prisma as any).customerNote.update({
      where: {
        id: noteId,
      },
      data: {
        note: noteContent,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: customerId, noteId } = params;

    // Check if note exists
    const existingNote = await (prisma as any).customerNote.findFirst({
      where: {
        id: noteId,
        customerId: customerId,
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    // Verify note belongs to customer
    if (existingNote.customerId !== customerId) {
      return NextResponse.json(
        { error: "Note does not belong to this customer" },
        { status: 403 }
      );
    }

    // Verify user is the creator of the note or an admin
    if (existingNote.createdById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You can only delete notes that you created" },
        { status: 403 }
      );
    }

    // Delete note
    await (prisma as any).customerNote.delete({
      where: {
        id: noteId,
      },
    });

    return NextResponse.json({
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}


