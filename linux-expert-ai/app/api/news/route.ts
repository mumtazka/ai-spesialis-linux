import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/news - Fetch latest Arch news
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')

    let query = supabase
      .from('arch_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(Math.min(limit, 100))

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching news:', error)
      return NextResponse.json(
        { error: 'Failed to fetch news' },
        { status: 500 }
      )
    }

    return NextResponse.json({ news: data || [] })
  } catch (error) {
    console.error('News API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/news - Create new news entry (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin role (you'd implement your own admin check)
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, category, severity, source_url } = body

    // Validate required fields
    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, category' },
        { status: 400 }
      )
    }

    const { data, error } = await (supabase.from('arch_news') as any)
      .insert({
        title,
        content,
        category,
        severity: severity || 'low',
        source_url,
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating news:', error)
      return NextResponse.json(
        { error: 'Failed to create news entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ news: data }, { status: 201 })
  } catch (error) {
    console.error('Create news error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/news/:id - Update news entry (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse ID from URL
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'News ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const { data, error } = await (supabase.from('arch_news') as any)
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating news:', error)
      return NextResponse.json(
        { error: 'Failed to update news entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ news: data })
  } catch (error) {
    console.error('Update news error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/news/:id - Delete news entry (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse ID from URL
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'News ID required' },
        { status: 400 }
      )
    }

    const { error } = await (supabase.from('arch_news') as any)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting news:', error)
      return NextResponse.json(
        { error: 'Failed to delete news entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete news error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
