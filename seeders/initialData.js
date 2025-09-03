// const Student = require('../models/student');
// const Activity = require('../models/activity');
// const Teacher = require('../models/teacher');

// module.exports = async () => {
//   await Teacher.bulkCreate([
//     { name: 'Ms. Clara' },
//     { name: 'Mr. Daniel' }
//   ]);

//   await Student.bulkCreate([
//     { name: 'Alice', disability: 'Dyslexia', learningStyle: 'visual', TeacherId: 1 },
//     { name: 'Bob', disability: 'ADHD', learningStyle: 'kinesthetic', TeacherId: 2 }
//   ]);

//   await Activity.bulkCreate([
//     { title: 'Visual Puzzle', description: 'Visual learning activity', difficulty: 'easy' },
//     { title: 'Movement Game', description: 'Kinesthetic task', difficulty: 'medium' }
//   ]);
// };

const Activity = require('../models/activity');
const Recommendation = require('../models/recommendation');

module.exports = async () => {
  await Activity.bulkCreate([
    {
      title: 'Visual Story Builder',
      description: 'Drag-and-drop image cards to form a story',
      difficulty: 'Easy',
      tags: ['visual', 'dyslexia', 'storytelling']
    },
    {
      title: 'Typing Adventure',
      description: 'Complete missions by typing words',
      difficulty: 'Medium',
      tags: ['dysgraphia', 'typing', 'kinesthetic']
    },
    {
      title: 'Color Coded Math',
      description: 'Match problems and answers with color feedback',
      difficulty: 'Medium',
      tags: ['math', 'visual', 'dyscalculia']
    },
    {
      title: 'Jump-to-Learn Quiz',
      description: 'Physical movement based quiz with jumping prompts',
      difficulty: 'Easy',
      tags: ['adhd', 'kinesthetic']
    },
    {
      title: 'Caption Match Game',
      description: 'Match images to captions in short videos',
      difficulty: 'Easy',
      tags: ['auditory', 'visual']
    },
    {
      title: 'Sequence the Steps',
      description: 'Reorder visual cards to complete a task',
      difficulty: 'Medium',
      tags: ['nvld', 'sequence', 'visual']
    }
  ]);

  console.log('✅ Activities seeded successfully');
};
