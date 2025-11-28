import { PrismaClient } from "@prisma/client";
import { emitNewActivity } from '../socket.js';

const prisma = new PrismaClient();

// Helper function to create system activity
export const createSystemActivity = async (data) => {
  console.log(data);
  try {
    const activity = await prisma.systemactivity.create({
      data: {
        action: data.action,
        actionType: data.actionType || 'info',
        message: data.message,
        customerId: data.customerId || null,
        userId: data.userId || null,
        details: data.details || null,
        performedBy: data.performedBy || 'System'
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // WebSocket ilə yeni aktivliyi emit et
    try {
      emitNewActivity(activity);
    } catch (socketError) {
      console.error('Error emitting activity via socket:', socketError);
      // Socket xətası aktivlik yaratmağı bloklamamalıdır
    }

    return activity;
  } catch (error) {
    console.error('Error creating system activity:', error);
    // Don't throw error - activity logging should not break main operations
    return null;
  }
};

// Get all system activities
export const getAllActivities = async (req, res) => {
  try {
    const { page = 1, limit = 50, actionType, action, search, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    const andConditions = [];
    
    // Action type filter
    if (actionType && actionType !== 'all') {
      andConditions.push({ actionType: actionType });
    }
    
    // Action filter
    if (action) {
      andConditions.push({ action: { contains: action } });
    }
    
    // Date range filter
    if (startDate || endDate) {
      const dateCondition = {};
      if (startDate) {
        dateCondition.gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        dateCondition.lte = new Date(endDate + 'T23:59:59.999Z');
      }
      andConditions.push({ createdAt: dateCondition });
    }
    
    // Search filter - search in message, customer name, performedBy
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      andConditions.push({
        OR: [
          { message: { contains: searchTerm } },
          { performedBy: { contains: searchTerm } },
          {
            customer: {
              OR: [
                { firstName: { contains: searchTerm } },
                { lastName: { contains: searchTerm } },
                { phone: { contains: searchTerm } }
              ]
            }
          }
        ]
      });
    }
    
    // Combine all conditions with AND
    if (andConditions.length > 0) {
      if (andConditions.length === 1) {
        Object.assign(where, andConditions[0]);
      } else {
        where.AND = andConditions;
      }
    }

    const [activities, total] = await Promise.all([
      prisma.systemactivity.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.systemactivity.count({ where })
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (e) {
    console.error('Get activities error:', e);
    res.status(500).json({
      success: false,
      message: 'Əməliyyat tarixçəsini əldə etmək mümkün olmadı',
      error: e.message
    });
  }
};

// Get activities by customer
export const getCustomerActivities = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 20 } = req.query;

    const activities = await prisma.systemactivity.findMany({
      where: { customerId },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (e) {
    console.error('Get customer activities error:', e);
    res.status(500).json({
      success: false,
      message: 'Müştəri əməliyyat tarixçəsini əldə etmək mümkün olmadı',
      error: e.message
    });
  }
};

