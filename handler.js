import AWS from "aws-sdk";
import sharp from "sharp";

const s3 = new AWS.S3();

export const getImage = async (params) => {
  try {
    const data = await s3.getObject(params).promise();

    return [data, null];
  } catch (error) {
    return [null, error];
  }
};

export const generateThumbnail = (image) => {
  const { THUMBNAIL_SIZE_WIDTH, THUMBNAIL_SIZE_HEIGHT } = process.env;

  const dimension = {
    width: parseInt(THUMBNAIL_SIZE_WIDTH),
    height: parseInt(THUMBNAIL_SIZE_HEIGHT),
  };

  try {
    return sharp(image)
      .resize(dimension.width, dimension.height, { fit: "contain" })
      .withMetadata()
      .toBuffer();
  } catch (error) {
    return null;
  }
};

export const uploadToS3 = (params) => s3.putObject(params).promise();

const thumbnailGenerator = async (event) => {
  const { THUMBNAIL_SIZE_WIDTH: width, THUMBNAIL_SIZE_HEIGHT: height } =
    process.env;
  const { Records } = event;
  const params = {
    Bucket: Records[0].s3.bucket.name,
    Key: Records[0].s3.object.key,
  };
  const response = {
    success: {
      statusCode: 200,
      message: "Success",
    },
    failed: {
      statusCode: 500,
      message: "Failed",
    },
  };

  try {
    const thumbnailSuffix = `--${width}x${height}-thumbnail.png`;
    const thumbnailKey = params.Key.split(".")[0] + thumbnailSuffix;

    // IMPORTANT: skip this function if the thumbnail already exists
    if (params.Key.includes(thumbnailSuffix)) return;

    const [data] = await getImage(params);
    const thumbnail = await generateThumbnail(data.Body);

    // now let's shove the created thumbnail to s3's bucket
    await uploadToS3({
      ...params,
      Key: thumbnailKey,
      Body: thumbnail,
    });

    return response.success;
  } catch (err) {
    console.log({ err });

    return response.failed;
  }
};

export default thumbnailGenerator;
