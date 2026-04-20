const path = require('path');
// Load environment variables FIRST, before requiring pool
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('./config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Realistic thread topics for a student forum
const threadTopics = [
  {
    category: 'academics',
    titles: [
      "Help with calculus homework?",
      "Does anyone have notes from yesterday's physics lecture?",
      "Best study techniques for finals?",
      "How do you approach data structures problems?",
      "Chemistry lab report tips?",
      "Anyone struggling with organic chemistry?",
      "Is Professor Smith's exam really that hard?",
      "Study group for Intro to CS?",
      "Tips for writing a good research paper?",
      "What's the best way to learn programming languages?",
      "How to manage time during midterms?",
      "Anyone else confused about the assignment?",
      "Best resources for learning SQL?",
      "How to ace technical interviews?",
      "Statistics: confidence intervals help?",
      "Literature essay structure advice?",
      "How to approach proofs in mathematics?",
      "Anyone taking Discrete Math? It's hard",
      "Web development: React or Vue for beginners?",
      "Recommendations for history papers?",
    ],
    bodies: [
      "I'm stuck on problem 5. Can anyone explain the concept? I've been watching videos but it's still not clicking.",
      "Just attended an amazing lecture on quantum mechanics. My mind is blown. Has anyone else taken this course?",
      "Hey everyone! For those of us studying for finals, let's share our study strategies. I'm using the Pomodoro technique and it's working well.",
      "What's your approach when you get stuck on a coding problem? Do you debug step-by-step or search online first?",
      "For those who have taken this class before, what do I need to know for the exam?",
      "I've read the textbook but I'm still confused about X. Does anyone want to explain it in simpler terms?",
      "Just finished my first draft. Any feedback would be appreciated!",
      "Looking for people who want to form a study group. We could meet at the library 2-3 times a week.",
      "I don't understand why my code isn't working. Can someone review my logic?",
      "Which textbook edition should we get? Is the older version cheaper and still useful?",
    ]
  },
  {
    category: 'general',
    titles: [
      "Best coffee spots near campus?",
      "Campus events this weekend?",
      "Dorm life tips for freshmen?",
      "How's the dining hall food?",
      "Best places to hang out on campus?",
      "Anyone want to play intramural sports?",
      "Campus safety concerns?",
      "Club recommendations?",
      "What's the vibe at the student center?",
      "Parking tips for commuters?",
      "Best libraries for quiet study?",
      "Anyone else hate the new class scheduling system?",
      "Campus is so crowded lately",
      "What clubs are worth joining?",
      "The new gym equipment is amazing",
      "Campus WiFi has been terrible",
      "Anyone go to last night's concert?",
      "The bookstore prices are insane",
      "Best study spots that aren't the library?",
      "Campus construction is out of control",
    ],
    bodies: [
      "Just discovered this amazing café near the student center. Their lattes are incredible and way cheaper than the campus bookstore.",
      "There's a concert coming up this Friday! Who's interested? I'm thinking of going with some friends.",
      "For new students: bring a fan for your dorm room, it gets hot. Also, the dining hall pizza on Thursdays is actually decent.",
      "I commute from home and parking is killing me. Does anyone know the best parking spot that doesn't fill up?",
      "Has anyone noticed the new tutoring center? They have free sessions and the tutors are really helpful.",
      "The student events board has some cool activities planned. I signed up for the hiking trip next month.",
      "Just wanted to say the campus is so beautiful this time of year. Anyone else appreciate the fall colors?",
      "For people living in the dorms: the quiet hours rule is important. Please respect it between 10pm-8am.",
      "The new student union building is finally open! The facilities are incredible.",
      "Anyone else missing the old dining hall menu? The new one is weird.",
    ]
  },
  {
    category: 'social',
    titles: [
      "Anyone want to grab lunch?",
      "Looking for roommates?",
      "Making friends in college is hard",
      "Anyone into gaming?",
      "Best weekend plans?",
      "Movie night anyone?",
      "Introvert tips for making friends?",
      "How do you handle homesickness?",
      "Anyone feel overwhelmed?",
      "Social anxiety advice?",
      "Making the transition to college is tough",
      "Anyone else feel lonely sometimes?",
      "Group project partners?",
      "Starting a D&D campaign, interested?",
      "Book club anyone?",
      "Fitness buddies?",
      "Anyone into board games?",
      "Coffee dates to destress?",
      "Mental health resources on campus?",
      "How to maintain long-distance friendships?",
    ],
    bodies: [
      "I just got here a few weeks ago and I'm struggling to make friends. Everyone seems so cliquey. Any advice?",
      "Does anyone want to start a gaming group? I'm into competitive shooters and RPGs. Let me know!",
      "I get really anxious in social situations. Does anyone have tips for managing it without totally avoiding people?",
      "For anyone dealing with homesickness: it gets better! I was homesick freshman year but now I'm happy here.",
      "Just wanted to reach out to anyone feeling overwhelmed. College is a lot. We're all going through it.",
      "Looking for people to grab lunch with tomorrow! No pressure, just casual hangout vibes.",
      "Started a movie night tradition with some friends and it's been so fun. Anyone want in?",
      "Does anyone know where the counseling center is? I want to talk to someone.",
      "Introvert here wondering how others make friends without forcing it? I like deep conversations, not big parties.",
      "Mental health check-in: how are you all doing? Be honest.",
    ]
  },
  {
    category: 'support',
    titles: [
      "Career path advice?",
      "Internship tips?",
      "How to network?",
      "Cover letter help?",
      "Interview preparation?",
      "Major selection help?",
      "Should I take a gap year?",
      "Graduate school worth it?",
      "How to handle work-life balance?",
      "Dealing with difficult professors?",
      "How to ask for help?",
      "Time management strategies?",
      "How to bounce back from failure?",
      "Financial aid questions?",
      "Should I change majors?",
      "How to stay motivated?",
      "Dealing with imposter syndrome?",
      "How to handle rejection?",
      "Sleep schedule tips?",
      "How to say no to things?",
    ],
    bodies: [
      "I'm not sure if my major is right for me. How do I know? Should I stick it out or switch?",
      "Just got rejected from an internship I really wanted. How do I bounce back and apply for more?",
      "I feel like I don't belong here sometimes. Everyone seems smarter than me. Is this normal?",
      "For those applying for internships: start early! I started in August and landed an interview by September.",
      "How do you balance school, work, and social life? I feel like I'm always behind on something.",
      "I'm considering a gap year after graduation. Anyone have experience with this? Worth it?",
      "How did you pick your major? I've been indecisive for a while now.",
      "Professor feedback was really harsh on my last assignment. How do I handle this?",
      "For anyone job hunting: network! Most of my opportunities came from people I knew, not just applications.",
      "Sleep schedule is wrecked from finals. Anyone have tips for getting back on track?",
    ]
  },
  {
    category: 'academics',
    titles: [
      "Why is organic chemistry so hard?",
      "How does the grading curve work?",
      "What's the drop deadline?",
      "When do grades get posted?",
      "How many credits do I need to graduate?",
      "Can I retake a class?",
      "What's a good GPA for grad school?",
      "Do these electives count toward my degree?",
      "How do I change my class schedule?",
      "What's the attendance policy?",
      "Can I audit this class?",
      "How do I get a transcript?",
      "What's the difference between pass/fail and letter grades?",
      "Can I get into this class if it's full?",
      "How does the waitlist work?",
      "Can I transfer credits from another school?",
      "What's the refund policy?",
      "How do I file a grade appeal?",
      "Is there a study abroad program?",
      "How do I declare a minor?",
    ],
    bodies: [
      "Quick question: is the final exam cumulative or just on the material after the midterm?",
      "Does anyone know if we're allowed to bring notes to the exam? I can't find this info on the syllabus.",
      "I'm thinking about auditing a class next semester. Does anyone have experience with this?",
      "Can I withdraw from a class after the deadline if I have a valid reason?",
      "How do I know if I have enough credits to graduate? The requirements are confusing.",
      "Is it worth retaking a class I got a C in to improve my GPA?",
      "Can someone explain how the college GPA versus cumulative GPA works?",
      "I want to study abroad next year. What's the process?",
      "Does my school allow grade replacement if I take a class twice?",
      "I'm interested in adding a double major. What's the process?",
    ]
  }
];

// Helper function to generate random dates in the past 3 months
function getRandomDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const randomTime = Math.random() * (now.getTime() - threeMonthsAgo.getTime()) + threeMonthsAgo.getTime();
  return new Date(randomTime);
}

// Helper to hash password using bcrypt
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function seedThreads() {
  try {
    console.log('🌱 Starting thread seeding...');
    
    // First, create test users
    console.log('👥 Creating test users...');
    const testUsers = [];
    const userEmails = [
      'student1@ufl.edu', 'student2@ufl.edu', 'student3@ufl.edu', 
      'student4@ufl.edu', 'student5@ufl.edu', 'student6@ufl.edu',
      'student7@ufl.edu', 'student8@ufl.edu', 'student9@ufl.edu',
      'student10@ufl.edu'
    ];
    
    for (const email of userEmails) {
      const hashedPassword = await hashPassword('testpassword');
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role, is_verified, status) 
         VALUES ($1, $2, 'student', true, 'active') 
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email 
         RETURNING id`,
        [email, hashedPassword]
      );
      testUsers.push(result.rows[0].id);
    }
    
    console.log(`✅ Created/verified ${testUsers.length} test users`);
    
    // Generate threads
    console.log('📝 Generating and inserting 125 threads...');
    let threadCount = 0;
    
    for (let i = 0; i < 125; i++) {
      // Pick random topic category
      const topic = threadTopics[Math.floor(Math.random() * threadTopics.length)];
      const categoryIndex = Math.floor(Math.random() * topic.titles.length);
      const title = topic.titles[categoryIndex];
      const body = topic.bodies[Math.floor(Math.random() * topic.bodies.length)];
      const userId = testUsers[Math.floor(Math.random() * testUsers.length)];
      const randomDate = getRandomDate();
      
      await pool.query(
        `INSERT INTO threads (user_id, title, body, category, view_count, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, title, body, topic.category, Math.floor(Math.random() * 200), randomDate, randomDate]
      );
      
      threadCount++;
      if (threadCount % 25 === 0) {
        console.log(`   ${threadCount}/125 threads inserted...`);
      }
    }
    
    console.log(`✅ Successfully inserted ${threadCount} threads!`);
    console.log('🎉 Seeding complete!');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
  } finally {
    await pool.end();
  }
}

seedThreads();
