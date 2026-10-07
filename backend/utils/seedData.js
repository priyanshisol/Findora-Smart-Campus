const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const Notification = require('../models/Notification');
const Match = require('../models/Match');
const ActivityLog = require('../models/ActivityLog');
const connectDB = require('../config/db');
const { runSmartMatchingForItem } = require('../services/matchingService');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log('Clearing existing database collections...');

    await User.deleteMany();
    await Item.deleteMany();
    await Claim.deleteMany();
    await Notification.deleteMany();
    await Match.deleteMany();
    await ActivityLog.deleteMany();

    console.log('Seeding Users...');

    // Create Admin User
    const adminUser = await User.create({
      name: 'Campus Administrator',
      email: 'admin@campus.edu',
      studentId: 'ADM-001',
      department: 'Campus Safety & Administration',
      passwordHash: 'adminpassword123',
      role: 'admin',
    });

    // Create Student Users
    const student1 = await User.create({
      name: 'Alex Morgan',
      email: 'alex.morgan@campus.edu',
      studentId: 'STU-2024-8901',
      department: 'Computer Science & Engineering',
      passwordHash: 'student123',
      role: 'student',
    });

    const student2 = await User.create({
      name: 'Sophia Chen',
      email: 'sophia.chen@campus.edu',
      studentId: 'STU-2024-4412',
      department: 'Business & Management',
      passwordHash: 'student123',
      role: 'student',
    });

    const student3 = await User.create({
      name: 'David Miller',
      email: 'david.miller@campus.edu',
      studentId: 'STU-2024-9031',
      department: 'Electrical Engineering',
      passwordHash: 'student123',
      role: 'student',
    });

    const student4 = await User.create({
      name: 'Emma Watson',
      email: 'emma.watson@campus.edu',
      studentId: 'STU-2024-1189',
      department: 'Biology & Life Sciences',
      passwordHash: 'student123',
      role: 'student',
    });

    console.log('Seeding Lost & Found Items...');

    // Sample Items
    const items = await Item.create([
      {
        title: 'Space Gray Apple MacBook Pro 14"',
        description: 'Lost my Space Gray M2 MacBook Pro inside the Science Library reading room on the 2nd floor. Has a transparent hard shell cover and a GitHub octocat sticker near the trackpad.',
        category: 'Electronics',
        type: 'lost',
        location: 'Science Library Reading Room 2nd Floor',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        reportDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'active',
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop'],
        distinctiveDetails: 'Serial ending in X892, octocat sticker on bottom right',
        contactMethod: 'in_app',
        reportedBy: student1._id,
      },
      {
        title: 'Apple Laptop Found at Science Library',
        description: 'Found a dark gray Apple laptop left on a study table near the elevator on the 2nd floor of Science Library. Handed over to security desk.',
        category: 'Electronics',
        type: 'found',
        location: 'Science Library 2nd Floor Elevator Desk',
        coordinates: { latitude: 37.7751, longitude: -122.4192 },
        reportDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'active',
        images: ['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&auto=format&fit=crop'],
        distinctiveDetails: 'Has protective shell case and stickers',
        safeContactPreference: 'Security Desk Verification',
        reportedBy: student2._id,
      },
      {
        title: 'Black Sony WH-1000XM4 Noise Canceling Headphones',
        description: 'Lost wireless black Sony over-ear headphones in a black zip case near the Student Union cafeteria outdoor terrace.',
        category: 'Electronics',
        type: 'lost',
        location: 'Student Union Terrace Cafeteria',
        coordinates: { latitude: 37.776, longitude: -122.418 },
        reportDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        status: 'active',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop'],
        distinctiveDetails: 'Small scratch on right ear cup cushion',
        reportedBy: student3._id,
      },
      {
        title: 'Navy Blue Leather Wallet with Campus Student ID',
        description: 'Lost my navy blue Tommy Hilfiger wallet containing student ID card for Alex Morgan, driver license, and campus library card.',
        category: 'ID & Wallet',
        type: 'lost',
        location: 'Engineering Building Quad Bench',
        coordinates: { latitude: 37.7742, longitude: -122.4201 },
        reportDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'active',
        images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop'],
        distinctiveDetails: 'Contains Alex Morgan Student ID #8901',
        reportedBy: student1._id,
      },
      {
        title: 'Found Blue Men\'s Wallet at Engineering Quad',
        description: 'Found a dark blue leather wallet under a wooden bench in the Engineering Quad near the fountain.',
        category: 'ID & Wallet',
        type: 'found',
        location: 'Engineering Quad Fountain Bench',
        coordinates: { latitude: 37.7743, longitude: -122.4202 },
        reportDate: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
        status: 'active',
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop'],
        distinctiveDetails: 'Verified ID inside by Dean office',
        reportedBy: student4._id,
      },
      {
        title: 'Texas Instruments TI-84 Plus CE Graphing Calculator',
        description: 'Found a white TI-84 graphing calculator in Mathematics Department Room 302 after Calculus lecture.',
        category: 'Books & Stationery',
        type: 'found',
        location: 'Math Building Room 302',
        coordinates: { latitude: 37.7735, longitude: -122.421 },
        reportDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'active',
        images: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop'],
        distinctiveDetails: 'Has initials DM written on back battery cover',
        reportedBy: student2._id,
      },
      {
        title: 'Stainless Steel Hydro Flask Water Bottle (Teal)',
        description: 'Lost 32oz Hydro Flask with national park stickers near the Recreation Center basketball courts.',
        category: 'Sports & Fitness',
        type: 'lost',
        location: 'Campus Sports Center Gym',
        coordinates: { latitude: 37.777, longitude: -122.417 },
        reportDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        status: 'recovered',
        images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop'],
        distinctiveDetails: 'Yosemite sticker on front side',
        reportedBy: student3._id,
      },
    ]);

    console.log('Running Smart Matching on Seed Items...');
    for (const item of items) {
      await runSmartMatchingForItem(item);
    }

    console.log('Seeding Sample Claims...');

    const claim1 = await Claim.create({
      itemId: items[1]._id, // Found Apple Laptop
      claimantId: student1._id, // Alex Morgan
      explanation: 'I left my Space Gray MacBook Pro on the 2nd floor study table around 4:00 PM while stepping out to grab coffee.',
      privateDetails: 'The laptop login user name is Alex Morgan, desktop wallpaper is a mountain landscape, serial number ends with X892.',
      status: 'pending',
    });

    const claim2 = await Claim.create({
      itemId: items[4]._id, // Found Blue Wallet
      claimantId: student1._id, // Alex Morgan
      explanation: 'This is my wallet that fell out of my backpack while sitting on the quad bench during lunch break.',
      privateDetails: 'Inside wallet: Alex Morgan Student ID card #8901, $25 cash, Metro transit pass.',
      status: 'approved',
      adminRemarks: 'Student ID verified in person at Campus Safety Office. Item handed over to claimant.',
      reviewedBy: adminUser._id,
    });

    console.log('Seeding Notifications & Activity Logs...');

    await Notification.create([
      {
        userId: student1._id,
        message: 'Potential High match (88%) found for your lost "Space Gray Apple MacBook Pro 14""!',
        type: 'match',
        relatedItem: items[1]._id,
        isRead: false,
      },
      {
        userId: student1._id,
        message: 'Your claim for "Found Blue Men\'s Wallet" has been APPROVED by campus safety administration.',
        type: 'claim_update',
        relatedItem: items[4]._id,
        relatedClaim: claim2._id,
        isRead: true,
      },
    ]);

    await ActivityLog.create([
      {
        userId: adminUser._id,
        action: 'SYSTEM_INITIALIZED_AND_SEEDED',
        targetType: 'system',
        timestamp: new Date(),
      },
      {
        userId: student1._id,
        action: 'REPORT_LOST_ITEM',
        targetType: 'item',
        targetId: items[0]._id.toString(),
      },
    ]);

    console.log('====================================================');
    console.log('SUCCESS: Database successfully seeded with Findora demo data!');
    console.log('Admin Account: admin@campus.edu / adminpassword123');
    console.log('Student Account: alex.morgan@campus.edu / student123');
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('Database Seed Error:', err);
    process.exit(1);
  }
};

seedData();
