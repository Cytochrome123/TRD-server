const { courseDB } = require("../db/adapters/course");

const course = {
    getCourses: async (req, res) => {
        try {

            const courses = await courseDB.getAllCourses();

            return res.status(200).json({ msg: 'Courses loaded', courses })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    getACourse: async (req, res) => {
        try {
            const { course } = req.body;

            return res.status(200).json({ msg: 'Course details', course })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    createCourse: async (req, res) => {
        try {
            const courseDetails = req.body;
            courseDetails['creatorID'] = my_details.id;
            courseDetails['status'] = 'Upcoming';
            console.log(courseDetails)

            const course = await courseDB.createCourse(courseDetails)

            return res.status(201).json({ msg: 'Course created', course })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    assignInstructor: async (req, res) => {
        try {
            const condition = { _id: req.params.id }

            const assign = {
                $push: {
                    instructors: {
                        $each: instructors.map((instructor) => ({ instructor: instructor.instructor })),
                    },
                },
            };

            const assigned = await courseDB.updateCourse(condition, assign)

            if (!assigned) throw new Error('Failed to assign course');

            return res.status(200).json({msg: 'Intructor(s) assigned successfully', assigned })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    }
}

module.exports = course;